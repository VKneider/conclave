export default class ViewHeader extends HTMLElement {

  static props = {
    title: { type: 'string', default: '' },
    subtitle: { type: 'string', default: '' },
  }

  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$title = this.querySelector('[data-el="title"]');
    this.$subtitle = this.querySelector('[data-el="subtitle"]');
    this._title = '';
    this._subtitle = '';
    slice.controller.setComponentProps(this, props);
  }

  get title() { return this._title; }
  set title(v) { this._title = v; this.$title.textContent = v; }

  get subtitle() { return this._subtitle; }
  set subtitle(v) { this._subtitle = v; this._renderSubtitle(); }

  init() {
    this.$title.textContent = this._title;
    this._renderSubtitle();
  }

  update() {
    // No-op: props-driven, no dynamic refresh needed.
  }

  _renderSubtitle() {
    if (this._subtitle) {
      this.$subtitle.innerHTML = this._subtitle;
      this.$subtitle.hidden = false;
    } else {
      this.$subtitle.hidden = true;
    }
  }
}

customElements.define("slice-viewheader", ViewHeader);
