export default class EmptyState extends HTMLElement {
  static props = {
    icon: { type: 'string', default: '📋' },
    title: { type: 'string', default: '' },
    description: { type: 'string', default: '' },
    buttonLabel: { type: 'string', default: '' },
    buttonRoute: { type: 'string', default: '' },
    buttonOnClick: { type: 'function', default: null },
  };

  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$icon = this.querySelector('[data-el="icon"]');
    this.$title = this.querySelector('[data-el="title"]');
    this.$description = this.querySelector('[data-el="description"]');
    this.$btnSlot = this.querySelector('[data-el="btnSlot"]');
    this._icon = '📋';
    this._title = '';
    this._description = '';
    this._buttonLabel = '';
    this._buttonRoute = '';
    this._buttonOnClick = null;

    slice.controller.setComponentProps(this, props);
  }

  get icon() { return this._icon; }
  set icon(v) { this._icon = v; this.$icon.textContent = v; }

  get title() { return this._title; }
  set title(v) { this._title = v; this.$title.textContent = v; }

  get description() { return this._description; }
  set description(v) { this._description = v; this.$description.textContent = v; }

  get buttonLabel() { return this._buttonLabel; }
  set buttonLabel(v) { this._buttonLabel = v; this._updateButton(); }

  get buttonRoute() { return this._buttonRoute; }
  set buttonRoute(v) { this._buttonRoute = v; this._updateButton(); }

  get buttonOnClick() { return this._buttonOnClick; }
  set buttonOnClick(v) { this._buttonOnClick = v; this._updateButton(); }

  async init() {
    this.$icon.textContent = this._icon;
    this.$title.textContent = this._title;
    this.$description.textContent = this._description;
    this._updateButton();
  }

  async _updateButton() {
    // Destroy previous button
    if (this._btn) {
      slice.controller.destroyComponent(this._btn);
      this._btn = null;
    }
    if (!this._buttonLabel) return;

    const onClick = this._buttonOnClick || (this._buttonRoute ? () => slice.router.navigate(this._buttonRoute) : null);
    if (!onClick) return;

    this._btn = await slice.build('Button', {
      value: this._buttonLabel,
      variant: 'filled',
      onClick,
    });
    if (this._btn instanceof Node) this.$btnSlot.appendChild(this._btn);
  }
}

customElements.define('slice-emptystate', EmptyState);
