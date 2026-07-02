// A draggable person chip, reused in PorCategoriaView's sidebar and inside every
// team square. Drag/drop is delegated to DragDropService (pointer-based,
// touch-friendly) — the chip registers itself as draggable with
// { memberId } as its drop payload; dropzones read that payload directly.
export default class OpcionChip extends HTMLElement {
  static props = {
    member: { type: 'object', default: null },
    draggable: { type: 'boolean', default: true },
  };

  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.opcion-chip');
    this.$sx = this.querySelector('.sx');
    this.$nm = this.querySelector('.nm');
    slice.controller.setComponentProps(this, props);
  }

  init() {
    // Chips are built once (PorCategoriaView never re-sets `.member` after
    // the initial build, only re-parents the node), so this is the only way
    // an already-open board picks up a live sexoEnabled toggle.
    slice.context.watch('settings', this, () => this._syncSx());
  }

  set member(value) {
    this._member = value || null;
    if (!this._member || !this.$nm) return;
    this.$nm.textContent = this._member.nombre || '';
    this._syncSx();
    this.title = `${this._member.nombre} — arrastra a una categoría`;
    this._registerDraggable();
  }

  get member() { return this._member; }

  _syncSx() {
    if (!this._member || !this.$sx) return;
    const enabled = slice.getComponent('SettingsService').isSexoEnabled();
    this.$sx.hidden = !enabled;
    this.$sx.className = `sx ${enabled ? (this._member.meta?.sexo || '') : ''}`;
  }

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
    // already-populated content, since the clone gets no props (member
    // stays null → the name never gets rendered into the ghost). A plain
    // <span> has no such re-construction step, so cloning it just copies
    // the DOM/text as-is. Its CSS (.opcion-chip below) is deliberately
    // NOT scoped under the slice-opcionchip tag prefix, precisely so it
    // still matches once the ghost is cloned and appended to <body>,
    // detached from any <slice-opcionchip> ancestor.
    dnd.makeDraggable(this.$root, {
      data: { memberId: String(this._member.id) },
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
