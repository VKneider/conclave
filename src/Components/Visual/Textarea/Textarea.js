// PATCHED (local, see GOTCHAS.md §14): three fixes on top of the registry
// version — (1) `grow()` never writes a 0px height: it skips while detached
// or display:none (scrollHeight is 0 there) and re-runs from
// `connectedCallback` and from a ResizeObserver, so a field built off-DOM
// (slice.build runs init() BEFORE the parent appends the node), hidden by a
// filter, or re-wrapped by a width change always ends up at its content
// height; (2) `updateState()` runs `validateValue()` when `conditions` are
// set, matching Input's behavior (the registry version only validated when a
// consumer called it by hand); (3) vertical/horizontal padding are exposed as
// `--slice-textarea-pad-y/-x` so dense consumers (TemaRow) can compact the
// field without breaking the floating label's alignment (see Textarea.css).
// If Textarea is ever re-synced (`slice sync`), re-check all three survived.
export default class Textarea extends HTMLElement {

   static props = {
      placeholder: { type: 'string', default: '', required: false },
      value: { type: 'string', default: '', required: false },
      rows: { type: 'number', default: 3 },
      maxlength: { type: 'number', default: null },
      required: { type: 'boolean', default: false },
      disabled: { type: 'boolean', default: false },
      autoGrow: { type: 'boolean', default: false },
      conditions: { type: 'object', default: null },
      onChange: { type: 'function', default: null },
   };

   constructor(props) {
      super();
      slice.attachTemplate(this);
      this.$container = this.querySelector('.slice_textarea');
      this.$textarea = this.querySelector('textarea');
      this.$placeholder = this.querySelector('.slice_textarea_placeholder');

      slice.controller.setComponentProps(this, props);
   }

   init() {
      if (this.placeholder) {
         this.$placeholder.textContent = this.placeholder;
         // The floating label is not associated via `for`, so expose it to AT here too.
         this.$textarea.setAttribute('aria-label', this.placeholder);
      }

      if (this.value) {
         this.$textarea.value = this.value;
         this.updateState();
      }

      this.$textarea.disabled = this.disabled;
      if (this.required) this.$container.classList.add('required');
      if (this.conditions) this.setupConditions();
      if (this._autoGrow) {
         this.$textarea.style.resize = 'none';
         this.grow();
      }

      // Live state: float the label, run auto-grow, surface the value via onChange.
      this.$textarea.addEventListener('input', () => {
         this.updateState();
         if (this._autoGrow) this.grow();
         if (typeof this._onChange === 'function') this._onChange(this.$textarea.value);
      });

      // Clicking the label or the padded container focuses the field (label has no `for`).
      this.$placeholder.addEventListener('click', () => this.$textarea.focus());
      this.$container.addEventListener('click', () => this.$textarea.focus());

      this.$textarea.addEventListener('focus', () => {
         this.$placeholder.classList.add('slice_textarea_focus');
      });
      this.$textarea.addEventListener('blur', () => {
         this.$placeholder.classList.remove('slice_textarea_focus');
      });
   }

   setupConditions() {
      const { regex, minLength = 0, maxLength = Infinity } = this.conditions;
      this._validator = regex
         ? new RegExp(regex)
         : { minLength, maxLength };
   }

   // Built off-DOM (slice.build → init) the field has no layout yet, so the
   // first real measurement happens once attached.
   connectedCallback() {
      if (this._autoGrow) this.grow();
   }

   beforeDestroy() {
      this._growObserver?.disconnect();
      this._growObserver = null;
   }

   grow() {
      if (!this.isConnected) return;
      this._observeGrow();
      // Reset to measure the true content height, then match it. A hidden
      // field (display:none somewhere up the tree) measures 0 — keep the last
      // good height instead of collapsing it; the observer re-measures once
      // it's visible again.
      const previous = this.$textarea.style.height;
      this.$textarea.style.height = 'auto';
      const h = this.$textarea.scrollHeight;
      if (!h) { this.$textarea.style.height = previous; this._growPending = true; return; }
      this._growPending = false;
      this.$textarea.style.height = `${h}px`;
   }

   // Re-measure when the field's width changes (text re-wraps) or when it
   // comes back from display:none (its size goes from 0 to something). The
   // observer ignores the height changes grow() itself causes.
   _observeGrow() {
      if (this._growObserver || typeof ResizeObserver === 'undefined') return;
      this._growWidth = 0;
      this._growObserver = new ResizeObserver((entries) => {
         const width = entries[0]?.contentRect?.width ?? 0;
         if (!width) return;
         if (width !== this._growWidth || this._growPending) {
            this._growWidth = width;
            this.grow();
         }
      });
      this._growObserver.observe(this.$textarea);
   }

   updateState() {
      if (this.$textarea.value !== '') {
         this.$placeholder.classList.add('slice_textarea_value');
         if (this._validator) this.validateValue();
         else this.triggerSuccess();
      } else {
         this.$placeholder.classList.remove('slice_textarea_value');
         if (this.required) this.triggerError();
      }
   }

   validateValue() {
      const v = this.$textarea.value;
      let ok = true;
      if (this._validator instanceof RegExp) {
         ok = this._validator.test(v);
      } else if (this._validator) {
         ok = v.length >= this._validator.minLength && v.length <= this._validator.maxLength;
      }
      if (ok) {
         this.triggerSuccess();
      } else {
         this.triggerError();
      }
      return ok;
   }

   clear() {
      if (this.$textarea.value !== '') {
         this.$textarea.value = '';
         this.$placeholder.className = 'slice_textarea_placeholder';
         if (this._autoGrow) this.grow();
      }
   }

   triggerSuccess() {
      this.$container.classList.remove('required', 'error');
   }

   triggerError() {
      this.$container.classList.add('error', 'required');
      setTimeout(() => {
         this.$container.classList.remove('error');
      }, 500);
   }

   get value() {
      return this.$textarea.value;
   }
   set value(newValue) {
      this.$textarea.value = newValue ?? '';
      this.updateState();
      if (this._autoGrow) this.grow();
   }

   get placeholder() {
      return this._placeholder;
   }
   set placeholder(value) {
      this._placeholder = value;
      if (this.$placeholder) this.$placeholder.textContent = value;
      if (this.$textarea && value) this.$textarea.setAttribute('aria-label', value);
   }

   get rows() {
      return this._rows;
   }
   set rows(value) {
      this._rows = value;
      if (this.$textarea && value) this.$textarea.rows = value;
   }

   get maxlength() {
      return this._maxlength;
   }
   set maxlength(value) {
      this._maxlength = value;
      if (this.$textarea && value != null) this.$textarea.maxLength = value;
   }

   get required() {
      return this._required;
   }
   set required(value) {
      this._required = value;
      if (this.$container) this.$container.classList.toggle('required', value);
   }

   get disabled() {
      return this._disabled;
   }
   set disabled(value) {
      this._disabled = value;
      if (this.$textarea) this.$textarea.disabled = value;
      if (this.$container) this.$container.classList.toggle('disabled', value);
   }

   get autoGrow() {
      return this._autoGrow;
   }
   set autoGrow(value) {
      this._autoGrow = value;
      if (this.$textarea && value) {
         this.$textarea.style.resize = 'none';
         this.grow();
      }
   }

   get conditions() {
      return this._conditions;
   }
   set conditions(value) {
      this._conditions = value;
      if (value) this.setupConditions();
   }

   get onChange() {
      return this._onChange;
   }
   set onChange(fn) {
      if (typeof fn === 'function') this._onChange = fn;
   }
}

customElements.define('slice-textarea', Textarea);
