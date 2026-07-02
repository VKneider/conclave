// Display icon/label per known theme name — falls back to a generic swatch
// icon and the raw theme name for anything not in this map, so a custom
// theme never renders blank.
const THEME_DISPLAY = {
   light: { icon: '☀️', label: 'Claro' },
   dark: { icon: '🌙', label: 'Oscuro' },
};

export default class ThemeSwitcher extends HTMLElement {
   static props = {
      themes: { type: 'array', default: ['LIGHT', 'DARK'] },
      variant: { type: 'string', default: 'button', allowedValues: ['button', 'menu-item'] },
      label: { type: 'string', default: 'Theme' },
      onChange: { type: 'function', default: null },
   };

   constructor(props) {
      super();
      slice.attachTemplate(this);

      this.$btn = this.querySelector('.theme-switcher');
      this.$icon = this.querySelector('.theme-switcher__icon');
      this.$label = this.querySelector('.theme-switcher__label');
      this.$value = this.querySelector('.theme-switcher__value');

      this.$btn.addEventListener('click', () => this.cycle());

      slice.controller.setComponentProps(this, props);
   }

   init() {
      this._sync();
   }

   /** Advance to the next theme in `themes`, wrapping around at the end. */
   async cycle() {
      const list = this._themes;
      const current = this._currentTheme();
      const next = list[(list.indexOf(current) + 1) % list.length];
      await this.setTheme(next);
   }

   /** Apply a theme by name. */
   async setTheme(name) {
      try {
         await slice.setTheme(name);
         if (typeof this._onChange === 'function') this._onChange(name);
      } catch (error) {
         slice.logger.logError('ThemeSwitcher', `Could not switch to theme "${name}"`, error);
      }
      this._sync(name);
   }

   // slice.theme is the framework's own current-theme getter — no need to
   // track it ourselves via a broadcast event. This app only ever builds one
   // ThemeSwitcher instance (in UserMenu), so there's nothing else to keep
   // in sync with anyway; setTheme() already calls _sync() on itself right
   // after applying the change.
   _currentTheme() {
      return slice.theme || this._themes[0];
   }

   _sync(name) {
      const current = name || this._currentTheme();
      const display = THEME_DISPLAY[String(current).toLowerCase()];
      if (this.$icon) this.$icon.textContent = display?.icon || '🎨';
      if (this.$value) this.$value.textContent = display?.label || current;
   }

   set themes(value) {
      this._themes = Array.isArray(value) && value.length ? value : ['LIGHT', 'DARK'];
      this._sync();
   }
   get themes() {
      return this._themes;
   }

   set variant(value) {
      this._variant = value === 'menu-item' ? 'menu-item' : 'button';
      this.classList.toggle('theme-switcher--menu', this._variant === 'menu-item');
      this.classList.toggle('theme-switcher--button', this._variant === 'button');
   }
   get variant() {
      return this._variant;
   }

   set label(value) {
      this._label = value || 'Theme';
      if (this.$label) this.$label.textContent = this._label;
   }
   get label() {
      return this._label;
   }

   set onChange(fn) {
      if (typeof fn === 'function') this._onChange = fn;
   }
   get onChange() {
      return this._onChange;
   }
}

customElements.define('slice-theme-switcher', ThemeSwitcher);
