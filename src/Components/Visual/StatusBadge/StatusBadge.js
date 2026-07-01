const STATUSES = new Set(['ok', 'under', 'over', 'empty']);

export default class StatusBadge extends HTMLElement {
  static props = {
    status: { type: 'string', default: 'empty', allowedValues: ['ok', 'under', 'over', 'empty'] },
    label: { type: 'string', default: '' },
  };

  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$badge = this.querySelector('.badge');
    slice.controller.setComponentProps(this, props);
  }

  set status(value) {
    const next = STATUSES.has(value) ? value : 'empty';
    if (this._status) this.$badge.classList.remove(this._status);
    this._status = next;
    this.$badge.classList.add(next);
  }

  get status() { return this._status; }

  set label(value) {
    this._label = value || '';
    this.$badge.textContent = this._label;
  }

  get label() { return this._label; }
}

customElements.define('slice-statusbadge', StatusBadge);
