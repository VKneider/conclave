import { getNode } from './icons.js';

export default class Icon extends HTMLElement {
  static props = {
    name: { type: 'string', default: 'circle-help' },
    size: { type: 'string', default: 'small' },
    color: { type: 'string', default: 'currentColor' },
  };

  constructor(props) {
    super();

    slice.attachTemplate(this);
    this.$container = this.querySelector('.slice-icon');
    this._size = 'small';
    this._color = 'currentColor';

    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._render();
  }

  update() {
    this._render();
  }

  _render() {
    const node = getNode(this._name);
    if (!this.$container) return;
    if (!node) {
      this.$container.textContent = '';
      return;
    }
    const sizeVal = this._resolveSize(this._size);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', sizeVal);
    svg.setAttribute('height', sizeVal);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', this._color || 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    for (const [tag, attrs] of node) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      svg.appendChild(el);
    }
    this.$container.innerHTML = '';
    this.$container.appendChild(svg);
  }

  _resolveSize(size) {
    if (size === 'small') return '16';
    if (size === 'medium') return '20';
    if (size === 'large') return '24';
    return size;
  }

  set name(value) {
    this._name = value;
    this._render();
  }

  get name() { return this._name; }

  set size(value) {
    this._size = value;
    this._render();
  }

  get size() { return this._size; }

  set color(value) {
    this._color = value;
    this._render();
  }

  get color() { return this._color; }
}

customElements.define('slice-icon', Icon);
