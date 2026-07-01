export default class ImportDrop extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$drop = this.querySelector('#drop');
    this.$input = this.querySelector('.import-drop__input');
    slice.controller.setComponentProps(this, props);
  }

  init() {
    this.$drop.onclick = () => this.$input.click();
    this.$input.onchange = () => {
      this._onFiles?.(this.$input.files);
      this.$input.value = '';
    };
    ['dragover', 'dragenter'].forEach((ev) => {
      this.$drop.addEventListener(ev, (e) => { e.preventDefault(); this.$drop.classList.add('drag'); });
    });
    ['dragleave', 'drop'].forEach((ev) => {
      this.$drop.addEventListener(ev, (e) => { e.preventDefault(); this.$drop.classList.remove('drag'); });
    });
    this.$drop.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files) this._onFiles?.(e.dataTransfer.files);
    });
  }

  set onFiles(cb) { this._onFiles = cb; }

  set accept(val) { this.$input.accept = val; }

  set multiple(val) { this.$input.multiple = val; }
}

customElements.define('slice-importdrop', ImportDrop);
