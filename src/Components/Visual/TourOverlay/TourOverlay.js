// TourOverlay paints one TourService step. The service owns navigation, focus and waiting.
import { texts } from '../../shared/text/texts.js';
import { toNodes, destroyNodes } from '../../shared/content/nodes.js';
import { placeCard } from './parts/placement.js';

const t = texts('slice.tour', {
   en: { next: 'Next', back: 'Back', skip: 'Skip', done: 'Done', close: 'Close tour', progress: '{index} of {total}', preparing: 'Preparing…', missing: 'This step is not available.' },
   es: { next: 'Siguiente', back: 'Atrás', skip: 'Omitir', done: 'Finalizar', close: 'Cerrar recorrido', progress: '{index} de {total}', preparing: 'Preparando…', missing: 'Este paso no está disponible.' },
});
let serial = 0;

export default class TourOverlay extends HTMLElement {
   static props = {
      // Internal view model from TourService; see tour-service.md for its fields.
      view: { type: 'object', default: null },
      onNext: { type: 'function', default: null },
      onPrev: { type: 'function', default: null },
      onSkip: { type: 'function', default: null },
      onClose: { type: 'function', default: null },
   };

   constructor(props) {
      super();
      slice.attachTemplate(this);
      this.$layer = this.querySelector('.slice-tour-overlay');
      this.$card = this.querySelector('.slice-tour-overlay__card');
      this.$panel = this.querySelector('.slice-tour-overlay__panel');
      this.$dim = this.querySelector('.slice-tour-overlay__dim');
      this.$spot = this.querySelector('.slice-tour-overlay__spotlight');
      this.$title = this.querySelector('.slice-tour-overlay__title');
      this.$content = this.querySelector('.slice-tour-overlay__content');
      this.$progress = this.querySelector('.slice-tour-overlay__progress');
      this.$status = this.querySelector('.slice-tour-overlay__status');
      this.$announcement = this.querySelector('.slice-tour-overlay__announcement');
      this.$arrow = this.querySelector('.slice-tour-overlay__arrow');
      this._controls = {};
      this._nodes = [];
      this._model = {};
      this._ready = false;
      this._dead = false;
      this._entered = false;
      this._glideTimer = null;
      const id = `slice-tour-${++serial}`;
      this.$title.id = `${id}-title`;
      this.$content.id = `${id}-content`;
      this.$card.setAttribute('aria-labelledby', this.$title.id);
      this.$card.setAttribute('aria-describedby', this.$content.id);
      slice.controller.setComponentProps(this, props);
   }

   async init() {
      for (const [name, variant] of [['close', 'ghost'], ['skip', 'ghost'], ['back', 'outlined'], ['next', 'filled']]) {
         const button = await slice.build('Button', {
            value: '', variant, size: 'sm',
            ...(name === 'close' ? { icon: { name: 'x', color: 'currentColor' } } : {}),
            onClick: () => this[`_on${{ close: 'Close', skip: 'Skip', back: 'Prev', next: 'Next' }[name]}`]?.(),
         });
         if (!button) throw new Error('TourOverlay requires Button and Icon in the registry.');
         if (this._dead) { slice.controller.destroyComponent(button); return; }
         this._controls[name] = button;
         this.querySelector(`.slice-tour-overlay__${name}`).append(button);
      }
      this._ready = true;
      slice.translator?.watch?.(this, () => this._paint());
      this._paint();
      if (typeof ResizeObserver === 'function') {
         this._resize = new ResizeObserver(() => this.position());
         this._resize.observe(this.$card);
      }
   }

   set view(value) { this._model = value && typeof value === 'object' ? value : {}; this._paint(); }
   get view() { return this._model; }
   set onNext(fn) { this._onNext = typeof fn === 'function' ? fn : null; }
   set onPrev(fn) { this._onPrev = typeof fn === 'function' ? fn : null; }
   set onSkip(fn) { this._onSkip = typeof fn === 'function' ? fn : null; }
   set onClose(fn) { this._onClose = typeof fn === 'function' ? fn : null; }

   show() {
      if (!this.isConnected) document.body.append(this);
      if (typeof this.$layer.showPopover === 'function') {
         try { this.$layer.showPopover(); } catch { /* already shown */ }
      } else this.$layer.removeAttribute('popover');
      this.position();
      this._animateEnter();
   }

   _t(key, params = {}) {
      const custom = this._model.texts?.[key];
      return custom == null ? t(key, params) : String(custom).replace(/\{(\w+)\}/g, (m, name) => name in params ? String(params[name]) : m);
   }

   _paint() {
      if (!this._ready || this._dead) return;
      const v = this._model, step = v.step || {};
      this.$layer.dataset.mode = step.interactive ? 'interactive' : 'modal';
      this.$card.setAttribute('aria-modal', String(!step.interactive && v.focusTrap !== false));
      this.$card.setAttribute('aria-busy', String(!!v.preparing));
      this.$title.textContent = step.title || this._t('preparing');
      if (this._shownContent !== step.content) {
         destroyNodes(this._nodes);
         this._nodes = toNodes(step.content, 'slice-tour-overlay__paragraph');
         this.$content.replaceChildren(...this._nodes);
         this._shownContent = step.content;
      }
      this.$progress.textContent = this._t('progress', { index: (v.index || 0) + 1, total: v.total || 1 });
      this.$status.hidden = !v.preparing && !v.missing;
      this.$status.textContent = v.preparing ? this._t('preparing') : v.missing ? this._t('missing') : '';
      this._controls.close.ariaLabel = this._t('close');
      this._controls.skip.value = this._t('skip');
      this._controls.back.value = this._t('back');
      this._controls.next.value = this._t(v.index === v.total - 1 ? 'done' : 'next');
      this._controls.next.disabled = !!v.preparing;
      this.querySelector('.slice-tour-overlay__back').hidden = !(v.index > 0);
      this._controls.back.disabled = !!v.preparing;
      this.$announcement.textContent = `${this.$progress.textContent}: ${this.$title.textContent}. ${this.$content.textContent}`;
      this.style.setProperty('--slice-tour-card-width', `${Math.max(240, Number(v.maxCardWidth) || 360)}px`);
      // While a new target is being prepared, keep the previous card position.
      // Recomputing it here with the next step's placement is what made it jump
      // to one spot and then another.
      if (!v.preparing || !this._rect) this.position();
   }

   // Rect-only updates do not re-render content or announce the step again.
   track(rect, glide = false) {
      // While the next step is preparing there is no new rect yet. Keeping the last
      // one avoids the card jumping to the centre and back on every Next.
      if (!rect && this._model.preparing && this._rect && !glide) return;
      if (glide) this._startGlide();
      const first = !!rect && !this._rect;
      this._rect = rect;
      this.position();
      if (first && !this.$spot.hidden) this._animateSpotlight();
   }

   position() {
      if (!this._ready || this._dead) return;
      const v = this._model, step = v.step || {}, rect = this._rect;
      const cutout = !!rect && step.spotlight !== false;
      this.$layer.dataset.cutout = String(cutout);
      this.$spot.hidden = !cutout;
      if (cutout) Object.assign(this.$spot.style, {
         left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: `${rect.radius ?? 8}px`,
      });
      const card = this.$card.getBoundingClientRect();
      const pos = placeCard(rect, card, step.placement || 'auto', { width: window.innerWidth, height: window.innerHeight });
      this.$card.style.left = `${pos.left}px`;
      this.$card.style.top = `${pos.top}px`;
      this.$card.dataset.placement = pos.side;
      this.$arrow.hidden = pos.side === 'center';
      const vertical = pos.side === 'top' || pos.side === 'bottom';
      const half = (parseFloat(getComputedStyle(this.$arrow).width) || 10) / 2;
      this.$arrow.style.left = `${vertical ? pos.left + pos.arrow - half : pos.side === 'left' ? pos.left + card.width - half : pos.left - half}px`;
      this.$arrow.style.top = `${vertical ? pos.side === 'top' ? pos.top + card.height - half : pos.top - half : pos.top + pos.arrow - half}px`;
   }

   _motion() {
      if (this._model.animate === false) return false;
      return typeof window.matchMedia !== 'function' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   }

   _duration(fallback) {
      const value = Number(this._model.duration);
      return Number.isFinite(value) && value >= 0 ? value : fallback;
   }

   // CSS transitions animate the card's real left/top and the spotlight geometry
   // from whatever is on screen to the new measured values. A rect interpolation
   // looked smooth until the new step's placement differed: then the card jumped
   // to the new placement around the old target before gliding.
   _startGlide() {
      if (!this._motion() || !this._rect) return;
      const duration = this._duration(300);
      if (duration <= 0) return;
      this.$layer.classList.add('is-gliding');
      this.$layer.style.setProperty('--slice-tour-glide', `${duration}ms`);
      this.$layer.style.setProperty('--slice-tour-glide-ease', 'cubic-bezier(0.2, 0, 0, 1)');
      clearTimeout(this._glideTimer);
      this._glideTimer = setTimeout(() => this.$layer.classList.remove('is-gliding'), duration + 32);
   }

   _animatePanel(distance, duration, fromOpacity = 0) {
      if (!this._motion() || !this.$panel || typeof this.$panel.animate !== 'function') return;
      // Interrupt the previous step instead of stacking animations on the same panel.
      for (const animation of this.$panel.getAnimations?.() || []) animation.cancel();
      this.$panel.animate([
         { opacity: fromOpacity, transform: `translateY(${distance}px)` },
         { opacity: 1, transform: 'translateY(0)' },
      ], { duration, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
   }

   _animateSpotlight() {
      if (!this._motion() || !this.$spot || typeof this.$spot.animate !== 'function') return;
      this.$spot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
   }

   _animateEnter() {
      this._entered = true;
      const duration = this._duration(300);
      this._animatePanel(10, duration, 0);
      if (!this.$spot.hidden) this._animateSpotlight();
      else if (this.$dim && this._motion() && typeof this.$dim.animate === 'function') {
         this.$dim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: Math.min(duration, 220), easing: 'ease-out' });
      }
   }

   beforeDestroy() {
      this._dead = true;
      clearTimeout(this._glideTimer);
      this.$layer?.classList.remove('is-gliding');
      this._resize?.disconnect();
      for (const animation of this.$panel?.getAnimations?.() || []) animation.cancel();
      for (const animation of this.$spot?.getAnimations?.() || []) animation.cancel();
      if (typeof this.$layer.hidePopover === 'function' && this.$layer.matches(':popover-open')) this.$layer.hidePopover();
      destroyNodes(this._nodes);
      this._nodes = [];
      for (const button of Object.values(this._controls)) {
         if (slice.controller.activeComponents.has(button.sliceId)) slice.controller.destroyComponent(button);
      }
      this._controls = {};
      this.remove();
   }
}
customElements.define('slice-tour-overlay', TourOverlay);
