export default class FinalTally extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.final-tally');
    this._items = [];
    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._html = slice.getComponent('HtmlService');
    this._render();
  }

  set items(arr) {
    this._items = arr || [];
    if (this.isConnected) this._render();
  }

  _render() {
    const items = this._items;
    if (!items.length) { this.$root.innerHTML = ''; return; }
    this.$root.innerHTML = this._html.sanitize(items.map((t) => `
      <div class="ft-chip" style="border-left-color:${t.color}">
        <div class="ft-top"><span class="color-dot" style="background:${t.color}"></span><span class="ft-name">${this._html.esc(t.nombre)}</span></div>
        <div class="ft-bottom"><span class="ft-count" style="color:${t.color}">${t.count}<small>/${t.max != null ? t.max : '–'}</small></span><span class="badge ${t.status}">${this._html.esc(t.badgeText)}</span></div>
      </div>
    `).join(''));
  }
}

customElements.define('slice-finaltally', FinalTally);
