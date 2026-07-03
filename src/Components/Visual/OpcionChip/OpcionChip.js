// A draggable person chip, reused in PorTemaView's sidebar and inside every
// tema square. Drag/drop is delegated to DragDropService (pointer-based,
// touch-friendly) — the chip registers itself as draggable with
// { opcionId } as its drop payload; dropzones read that payload directly.
export default class OpcionChip extends HTMLElement {
  static props = {
    opcion: { type: 'object', default: null },
    draggable: { type: 'boolean', default: true },
  };

  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.opcion-chip');
    this.$nm = this.querySelector('.nm');
    slice.controller.setComponentProps(this, props);
  }

  set opcion(value) {
    this._member = value || null;
    if (!this._member || !this.$nm) return;
    this.$nm.textContent = this._member.nombre || '';
    this.title = `${this._member.nombre} — arrastra a un tema`;
    this._registerDraggable();
  }

  get opcion() { return this._member; }

  set draggable(value) {
    this._draggable = value !== false;
    this._registerDraggable();
  }

  get draggable() { return this._draggable; }

  _registerDraggable() {
    if (!this._member || !this._draggable || !this.$root) return;
    const dnd = slice.getComponent('DragDropService');
    if (!dnd) return;
    dnd.detach(this.$root);
    // Drag the INNER .opcion-chip span, not the outer <slice-opcionchip>
    // element. DragDropService clones whatever node it's given via
    // node.cloneNode(true) — cloning a custom element re-runs ITS
    // CONSTRUCTOR (that's how the platform upgrades a cloned custom
    // element), which calls slice.attachTemplate() again and wipes out the
    // already-populated content, since the clone gets no props (opcion
    // stays null → the name never gets rendered into the ghost). A plain
    // <span> has no such re-construction step, so cloning it just copies
    // the DOM/text as-is. Its CSS (.opcion-chip below) is deliberately
    // NOT scoped under the slice-opcionchip tag prefix, precisely so it
    // still matches once the ghost is cloned and appended to <body>,
    // detached from any <slice-opcionchip> ancestor.
    dnd.makeDraggable(this.$root, {
      data: { opcionId: String(this._member.id) },
      ghost: true,
      threshold: 4,
      onDragStart: () => this.$root.classList.add('dragging'),
      onDragEnd: () => this.$root.classList.remove('dragging'),
    });
  }

  beforeDestroy() {
    const dnd = slice.getComponent('DragDropService');
    if (dnd && this.$root) dnd.detach(this.$root);
  }
}

customElements.define('slice-opcionchip', OpcionChip);
