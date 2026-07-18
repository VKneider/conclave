// CarouselView — reusable navigation shell for item-by-item display.
// Receives pre-built DOM/Slice nodes via the `items` setter, moves them
// into its internal stage, and manages visibility + arrow/dot/keyboard nav.
// View modes: 'single' | 'columns' | 'grid'.
//
// Usage:
//   const carousel = await slice.build('CarouselView', { mode: 'grid' });
//   carousel.items = [card1, card2, card3];
//   container.appendChild(carousel);
//
//   carousel.mode = 'single';   // switch view

const MODES = ['single', 'columns', 'grid'];

export default class CarouselView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$stage = this.querySelector('.cv-stage');
    this.$nav = this.querySelector('[data-cvnav]');
    this.$prev = this.querySelector('[data-cvdir="prev"]');
    this.$next = this.querySelector('[data-cvdir="next"]');
    this.$count = this.querySelector('.cv-count');
    this.$dots = this.querySelector('.cv-dots');

    this._items = [];
    this._index = 0;
    this._mode = 'single';
    this._dotHandler = null;

    this.$prev.addEventListener('click', () => this.prev());
    this.$next.addEventListener('click', () => this.next());

    this._onKeydown = (e) => {
      if (this._mode === 'grid') return;
      if (e.target.closest('textarea, input, [contenteditable]')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
    };

    slice.controller.setComponentProps(this, props);
  }

  init() {
    document.addEventListener('keydown', this._onKeydown);
    this._render();
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onKeydown);
  }

  set items(arr) {
    this._items = arr || [];
    this._index = 0;
    this.$stage.replaceChildren(...this._items);
    this._render();
  }

  get items() { return this._items; }

  set mode(m) {
    if (MODES.includes(m)) {
      this._mode = m;
      this._index = 0;
      this._render();
    }
  }

  get mode() { return this._mode; }

  prev() {
    const step = this._mode === 'columns' ? 2 : 1;
    if (this._index > 0) { this._index = Math.max(0, this._index - step); this._render(); }
  }

  next() {
    const step = this._mode === 'columns' ? 2 : 1;
    const max = this._maxIndex();
    if (this._index < max) { this._index = Math.min(max, this._index + step); this._render(); }
  }

  refresh() { this._render(); }

  goTo(i) {
    i = Math.max(0, Math.min(i, this._maxIndex()));
    if (i !== this._index) { this._index = i; this._render(); }
  }

  _maxIndex() {
  const total = this._items.length;
  if (this._mode === 'columns') return Math.max(0, (Math.ceil(total / 2) - 1) * 2);
  return Math.max(0, total - 1);
  }

  _render() {
    const total = this._items.length;
    if (!total) { this.$nav.hidden = true; return; }

    const maxI = this._maxIndex();
    if (this._index > maxI) this._index = maxI;

    const inColumns = this._mode === 'columns';

    this._items.forEach((item, i) => {
      let visible;
      if (this._mode === 'grid') {
        visible = true;
      } else if (inColumns) {
        visible = (i === this._index || i === this._index + 1);
      } else {
        visible = (i === this._index);
      }
      item.style.display = visible ? '' : 'none';
    });

    this.$stage.className = 'cv-stage';
    if (this._mode === 'grid') this.$stage.classList.add('cv-stage--grid');
    if (this._mode === 'columns') this.$stage.classList.add('cv-stage--columns');

    if (this._mode === 'grid') {
      this.$nav.hidden = true;
      return;
    }
    this.$nav.hidden = false;
    this.$prev.disabled = this._index === 0;
    this.$next.disabled = this._index >= this._maxIndex();
    const pageCount = inColumns ? Math.ceil(total / 2) : total;
    const pageIndex = inColumns ? Math.floor(this._index / 2) : this._index;
    this.$count.textContent = `${pageIndex + 1} de ${pageCount}`;

    const dotCount = inColumns ? Math.ceil(total / 2) : total;
    this.$dots.innerHTML = Array.from({ length: dotCount }, (_, i) =>
      `<span class="cv-dot${i === (inColumns ? Math.floor(this._index / 2) : this._index) ? ' active' : ''}" data-cvdot="${i}"></span>`
    ).join('');

    if (this._dotHandler) this.$dots.removeEventListener('click', this._dotHandler);
    this._dotHandler = (e) => {
      const dot = e.target.closest('[data-cvdot]');
      if (!dot) return;
      const target = parseInt(dot.dataset.cvdot);
      this.goTo(inColumns ? target * 2 : target);
    };
    this.$dots.addEventListener('click', this._dotHandler);
  }
}

customElements.define('slice-carouselview', CarouselView);
