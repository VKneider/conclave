// TourService: one active guided tour per app. UI is built only through TourOverlay.
import { lockScroll } from '../../shared/overlay/scrollLock.js';
import { normalizeStep, cancellable } from './parts/steps.js';

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default class TourService {
   static _live = 0;
   static _owner = null;

   constructor() {
      this._run = null;
      this._lastKey = null;
      this._dead = false;
      this._storageWarned = false;
      TourService._live += 1;
      if (TourService._live > 1) slice.logger?.logWarning?.('TourService', 'Multiple TourServices are alive. Use slice.build("TourService", { singleton: true }). Only one tour can run at a time.');
   }

   get index() { return this._run?.index ?? -1; }
   get isActive() { return !!this._run; }
   get currentStep() { return this._run?.steps[this.index] ?? null; }
   get overlay() { return this._run?.overlay ?? null; }

   /** Resolves when the tour ends, rather than when its first card appears. */
   start(steps, options = {}) {
      if (this._dead) return Promise.resolve({ completed: false, reason: 'stopped' });
      TourService._owner?.stop('replaced');
      this.stop('replaced');
      this._lastKey = options.storageKey || null;
      if (!Array.isArray(steps) || !steps.length) return Promise.resolve({ completed: false, reason: 'target-missing' });
      if (options.storageKey && !options.force && this._storage('get', options.storageKey)) return Promise.resolve({ completed: true, reason: 'completed' });
      let resolve;
      const ended = new Promise(r => { resolve = r; });
      const run = {
         steps: steps.map(step => normalizeStep(step, options)), options, resolve,
         index: 0, overlay: null, transition: null,
         busy: false, preparing: true, missing: false, target: null, tracking: null,
         returnFocus: document.activeElement, releaseScroll: null, inert: new Map(),
      };
      this._run = run;
      TourService._owner = this;
      this._launch(run);
      return ended;
   }

   next() { this._navigate(1, false); return this; }
   prev() { if (this.index > 0) this._navigate(-1, false); return this; }
   stop(reason = 'stopped') { if (this._run) this._finish(this._run, false, reason); return this; }
   reset(storageKey = this._lastKey) { if (storageKey) this._storage('remove', storageKey); return this; }

   beforeDestroy() {
      if (this._dead) return;
      this._dead = true;
      this.stop();
      TourService._live = Math.max(0, TourService._live - 1);
   }

   async _launch(run) {
      try {
         const overlay = await slice.build('TourOverlay', {
            onNext: () => this.next(), onPrev: () => this.prev(),
            onSkip: () => this._navigate(1, true), onClose: () => this.stop(),
         });
         if (!overlay) throw new Error('TourService requires TourOverlay, Button and Icon in the registry.');
         if (this._run !== run) { slice.controller.destroyComponent(overlay); return; }
         run.overlay = overlay;
         overlay.view = this._view(run);
         overlay.show();
         run.key = event => this._key(run, event);
         run.focus = event => {
            if (this._traps(run) && !overlay.$card.contains(event.target)) overlay.$card.focus({ preventScroll: true });
         };
         document.addEventListener('keydown', run.key, true);
         document.addEventListener('focusin', run.focus, true);
         // Unsubscribe happens in stop(). Defer it out of EventManager's dispatch loop:
         // deleting the last subscription while it is iterating leaves a stale Map read.
         run.route = () => queueMicrotask(() => this.stop('route'));
         if (run.options.stopOnRouteChange !== false) run.routeSubscription = slice.events?.subscribe?.('router:change', run.route);
         run.options.onStart?.({ steps: run.steps });
         if (this._run !== run) return;
         this._emit('tour:start', { steps: run.steps, id: this.sliceId });
         await this._enter(run, 0);
      } catch (error) { this._fail(run, error); }
   }

   _view(run) {
      return { step: run.steps[run.index], index: run.index, total: run.steps.length, preparing: run.preparing,
         missing: run.missing, focusTrap: run.options.focusTrap, texts: run.steps[run.index].texts,
         maxCardWidth: run.options.maxCardWidth, animate: run.options.animate !== false,
         duration: Number.isFinite(Number(run.options.duration)) && Number(run.options.duration) >= 0 ? Number(run.options.duration) : 300 };
   }

   async _navigate(direction, skip) {
      const run = this._run;
      if (!run || run.busy || (run.preparing && !skip)) return;
      run.busy = true;
      this._clearTracking(run);
      run.transition?.abort();
      const transition = new AbortController();
      run.transition = transition;
      try {
         const step = run.steps[run.index];
         if (step.afterStep) await cancellable(() => step.afterStep({ tour: this, step, index: run.index, signal: transition.signal }), transition.signal, step.timeout);
         if (this._run !== run) return;
         const index = run.index + direction;
         if (index >= run.steps.length) this._finish(run, !skip, skip ? 'skipped' : 'completed');
         else { run.busy = false; await this._enter(run, Math.max(0, index), Math.sign(direction)); }
      } catch (error) { this._fail(run, error); }
      finally { run.busy = false; }
   }

   async _enter(run, index, direction = 1) {
      if (this._run !== run) return;
      if (index < 0 || index >= run.steps.length) { this._finish(run, false, 'target-missing'); return; }
      run.transition?.abort();
      const transition = new AbortController();
      run.transition = transition;
      const signal = transition.signal;
      run.index = index;
      run.direction = direction;
      run.preparing = true;
      run.missing = false;
      run.target = null;
      const step = run.steps[index];
      run.overlay.view = this._view(run);
      this._mode(run, step);
      if (this._run !== run) return;
      try {
         if (step.beforeStep) {
            const result = await cancellable(() => step.beforeStep({ tour: this, step, index, signal }), signal, step.timeout);
            if (result === false) return this._enter(run, index + direction, direction);
            if (result && 'target' in result) step.target = result.target;
         }
         if (this._run !== run || signal.aborted) return;
         await this._resolve(run, signal);
      } catch (error) { this._fail(run, error); }
   }

   async _resolve(run, signal) {
      const step = run.steps[run.index];
      let target = this._element(step.target);
      let waitReady = !step.waitFor;
      if (step.waitFor || !target) {
         const anchor = this._element(step.anchor);
         run.target = anchor;
         this._measure(run, !!anchor);
         // Modal steps stay locked while waiting; interactive steps keep the page usable.
         const deadline = performance.now() + step.timeout;
         if (step.waitFor) {
            while (!signal.aborted) {
               let ready;
               try {
                  ready = typeof step.waitFor === 'function'
                     ? await cancellable(() => step.waitFor({ tour: this, step, index: run.index, signal }), signal, Math.max(1, deadline - performance.now()))
                     : this._element(step.waitFor);
               } catch (error) {
                  if (error.message === 'Tour step timed out') break;
                  throw error;
               }
               waitReady = !!ready;
               target = this._element(step.target);
               if (ready && target) break;
               if (performance.now() >= deadline) break;
               run.target = this._element(step.anchor);
               this._measure(run, !!run.target);
               await this._wait(signal, Math.min(80, Math.max(1, deadline - performance.now())), true);
            }
         }
      }
      if (signal.aborted || this._run !== run) return;
      target = waitReady ? this._element(step.target) : null;
      if (!target) {
         step.onTargetMissing?.(step);
         if (this._run !== run || signal.aborted) return;
         if (step.fallback === 'skip') return this._enter(run, run.index + run.direction, run.direction);
         run.missing = true;
      }
      run.target = target;
      if (target && run.options.scrollIntoView !== false) {
         // Release our page lock before scrolling, then re-acquire after settling.
         run.releaseScroll?.(); run.releaseScroll = null;
         target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
         await this._wait(signal, 32);
      }
      if (signal.aborted || this._run !== run) return;
      run.preparing = false;
      this._mode(run, step);
      // Measure first, then paint the ready view: position() must never run with
      // the old rect plus the new step's placement (that is the flash on Next).
      run.rectKey = null;
      this._measure(run, true);
      run.overlay.view = this._view(run);
      this._track(run);
      run.options.onStep?.({ step, index: run.index });
      if (this._run === run) this._emit('tour:step', { step, index: run.index, total: run.steps.length });
   }

   _element(value) {
      const candidate = typeof value === 'function' ? value() : value;
      const element = typeof candidate === 'string' ? document.querySelector(candidate) : candidate;
      if (!(element instanceof Element) || !element.isConnected || !element.getClientRects().length) return null;
      const style = getComputedStyle(element);
      return style.visibility === 'hidden' || style.display === 'none' ? null : element;
   }

   _wait(signal, ms, observe = false) {
      return new Promise((resolve, reject) => {
         let observer;
         const cleanup = () => { clearTimeout(timer); observer?.disconnect(); signal.removeEventListener('abort', abort); };
         const done = () => { cleanup(); resolve(); };
         const abort = () => { cleanup(); reject(new DOMException('Tour cancelled', 'AbortError')); };
         const timer = setTimeout(done, ms);
         if (signal.aborted) return abort();
         signal.addEventListener('abort', abort, { once: true });
         if (observe) {
            observer = new MutationObserver(done);
            observer.observe(document.body, { subtree: true, childList: true, attributes: true });
         }
      });
   }

   _traps(run) { return !run.steps[run.index].interactive && run.options.focusTrap !== false; }

   _mode(run, step) {
      // Modal uses native <dialog> focus management; there is no JS trap to extract from Modal.
      const modal = !step.interactive;
      if (modal && document.querySelector('dialog:modal')) throw new Error('Split the tour before opening a Modal, or use an interactive step.');
      if (!modal || run.options.lockScroll === false) { run.releaseScroll?.(); run.releaseScroll = null; }
      else if (!run.releaseScroll) run.releaseScroll = lockScroll();
      this._restoreInert(run);
      if (this._traps(run)) {
         const makeInert = () => {
            for (const child of document.body.children) {
               if (child === run.overlay || run.inert.has(child) || ['SCRIPT', 'STYLE', 'LINK'].includes(child.tagName)) continue;
               run.inert.set(child, child.inert);
               child.inert = true;
            }
         };
         makeInert();
         run.inertObserver = new MutationObserver(makeInert);
         run.inertObserver.observe(document.body, { childList: true });
         if (!run.overlay.$card.contains(document.activeElement)) run.overlay.$card.focus({ preventScroll: true });
      }
   }

   _restoreInert(run) {
      run.inertObserver?.disconnect(); run.inertObserver = null;
      for (const [element, inert] of run.inert) element.inert = inert;
      run.inert.clear();
   }

   _key(run, event) {
      if (this._run !== run) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.stop(); return; }
      if (event.key === 'Tab' && this._traps(run)) {
         const card = run.overlay.$card;
         const nodes = [...card.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length && !el.closest('[hidden]'));
         const at = nodes.indexOf(document.activeElement);
         if (!nodes.length) { event.preventDefault(); card.focus(); }
         else if (event.shiftKey && at <= 0) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
         else if (!event.shiftKey && (at < 0 || at === nodes.length - 1)) { event.preventDefault(); nodes[0].focus(); }
         return;
      }
      // Page controls keep their arrows/Enter in interactive mode; editable content always does.
      if (run.steps[run.index].interactive || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); this.next(); }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); this.prev(); }
      if (event.key === 'Home' && run.index > 0) { event.preventDefault(); this._navigate(-run.index, false); }
      if (event.key === 'End' && run.index < run.steps.length - 1) { event.preventDefault(); this._navigate(run.steps.length - 1 - run.index, false); }
   }

   _measure(run, glide = false) {
      const target = run.target;
      let rect = null;
      if (target?.isConnected && target.getClientRects().length) {
         const r = target.getBoundingClientRect(), step = run.steps[run.index], p = step.padding;
         rect = { left: r.left - p, top: r.top - p, right: r.right + p, bottom: r.bottom + p,
            width: r.width + p * 2, height: r.height + p * 2, radius: Number.isFinite(Number(step.radius)) ? Math.max(0, Number(step.radius)) : (parseFloat(getComputedStyle(target).borderRadius) || 8) };
      }
      const key = JSON.stringify(rect);
      if (key !== run.rectKey) { run.rectKey = key; run.overlay.track(rect, glide); }
   }

   _track(run) {
      this._clearTracking(run);
      run.rectKey = null;
      const tick = () => {
         if (this._run !== run) return;
         try {
            if (!document.hidden && !run.missing) {
               const target = this._element(run.steps[run.index].target);
               if (run.target && !target) {
                  this._clearTracking(run);
                  run.preparing = true;
                  run.overlay.view = this._view(run);
                  this._resolve(run, run.transition.signal).catch(error => this._fail(run, error));
                  return;
               }
               run.target = target;
               this._measure(run);
            }
            if (!document.hidden) run.frame = requestAnimationFrame(tick);
         } catch (error) { this._fail(run, error); }
      };
      run.tracking = () => { run.rectKey = null; };
      run.visibility = () => {
         cancelAnimationFrame(run.frame);
         if (!document.hidden) run.frame = requestAnimationFrame(tick);
      };
      document.addEventListener('visibilitychange', run.visibility);
      window.addEventListener('resize', run.tracking);
      document.addEventListener('scroll', run.tracking, { capture: true, passive: true });
      if (!document.hidden) run.frame = requestAnimationFrame(tick);
   }

   _clearTracking(run) {
      cancelAnimationFrame(run.frame);
      if (run.visibility) document.removeEventListener('visibilitychange', run.visibility);
      run.visibility = null;
      if (run.tracking) {
         window.removeEventListener('resize', run.tracking);
         document.removeEventListener('scroll', run.tracking, true);
         run.tracking = null;
      }
   }

   _finish(run, completed, reason) {
      if (this._run !== run) return;
      this._run = null;
      if (TourService._owner === this) TourService._owner = null;
      run.transition?.abort();
      this._clearTracking(run);
      document.removeEventListener('keydown', run.key, true);
      document.removeEventListener('focusin', run.focus, true);
      if (run.route) slice.events?.unsubscribe?.('router:change', run.routeSubscription);
      this._restoreInert(run);
      run.releaseScroll?.();
      if (run.overlay) slice.controller.destroyComponent(run.overlay);
      if (completed && run.options.storageKey) this._storage('set', run.options.storageKey);
      if (run.returnFocus?.isConnected) run.returnFocus.focus?.({ preventScroll: true });
      const result = { completed, reason };
      run.resolve(result);
      try { run.options.onEnd?.({ ...result, index: run.index }); }
      catch (error) { this._log('onEnd failed', error); }
      this._emit('tour:end', { ...result, index: run.index });
   }

   _fail(run, error) {
      if (this._run !== run || error?.name === 'AbortError') return;
      this._log('Tour failed', error);
      this._finish(run, false, 'error');
   }

   _log(message, error) { slice.logger?.logError?.('TourService', `${message}: ${error?.message || error}`); }
   _emit(name, detail) { slice.events?.emit?.(name, detail); }

   _storage(action, key) {
      try {
         if (action === 'get') return !!JSON.parse(localStorage.getItem(key) || 'null')?.completedAt;
         if (action === 'set') localStorage.setItem(key, JSON.stringify({ completedAt: new Date().toISOString(), version: 1 }));
         if (action === 'remove') localStorage.removeItem(key);
      } catch (error) {
         if (!this._storageWarned) { this._storageWarned = true; slice.logger?.logWarning?.('TourService', `Completion storage unavailable: ${error.message}`); }
      }
      return false;
   }
}
