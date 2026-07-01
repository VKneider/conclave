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
      this.$label = this.querySelector('.theme-switcher__label');
      this.$value = this.querySelector('.theme-switcher__value');

      // Keep every theme control in the app (selector, switcher, menus) in sync.
      this._onThemeChanged = (e) => this._sync(e.detail?.themeName);
      this.$btn.addEventListener('click', () => this.cycle());

      slice.controller.setComponentProps(this, props);
   }

   init() {
      document.addEventListener('themeChanged', this._onThemeChanged);
      this._sync();
   }

   beforeDestroy() {
      document.removeEventListener('themeChanged', this._onThemeChanged);
   }

   /** Advance to the next theme in `themes`, wrapping around at the end. */
   async cycle() {
      const list = this._themes;
      const current = this._currentTheme();
      const next = list[(list.indexOf(current) + 1) % list.length];
      await this.setTheme(next);
   }

   /** Apply a theme by name and notify every other theme control. */
   async setTheme(name) {
      try {
         await slice.setTheme(name);
         document.dispatchEvent(new CustomEvent('themeChanged', { detail: { themeName: name } }));
         if (typeof this._onChange === 'function') this._onChange(name);
      } catch (error) {
         slice.logger.logError('ThemeSwitcher', `Could not switch to theme "${name}"`, error);
      }
      this._sync(name);
   }

   _currentTheme() {
      return (
         slice.stylesManager?.themeManager?.currentTheme ||
         slice.theme ||
         this._themes[0]
      );
   }

   _sync(name) {
      const current = name || this._currentTheme();
      if (this.$value) this.$value.textContent = current;
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
