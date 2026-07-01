import { esc } from '/utils/format.js';

export default class FinalTally extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.final-tally');
    this._items = [];
    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._paint();
  }

  set items(arr) {
    this._items = arr || [];
    if (this.isConnected) this._paint();
  }

  _paint() {
    const items = this._items;
    if (!items.length) { this.$root.innerHTML = ''; return; }
    this.$root.innerHTML = items.map((t) => `
      <div class="ft-chip" style="border-left-color:${t.color}">
        <div class="ft-top"><span class="color-dot" style="background:${t.color}"></span><span class="ft-name">${esc(t.nombre)}</span></div>
        <div class="ft-bottom"><span class="ft-count" style="color:${t.color}">${t.count}<small>/${t.max != null ? t.max : '–'}</small></span><span class="badge ${t.status}">${esc(t.badgeText)}</span></div>
      </div>
    `).join('');
  }
}

customElements.define('slice-finaltally', FinalTally);
