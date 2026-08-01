export default class Link extends HTMLElement {
   constructor(props = {}) {
      super();
      this.props = props;
      this.render(props);
      this.init();
   }

   init() {
      this.addEventListener('click', this.onClick);
   }

   async onClick(event) {
      event.preventDefault();
      const path = this.querySelector('a')?.getAttribute('href');
      if (path) slice.router.navigate(path);
   }

   // Built with DOM APIs (createElement / textContent / insertAdjacentHTML for
   // the IconProvider SVG only) instead of an innerHTML template so a `path`
   // like `javascript:...` or text containing markup can't inject into the
   // document. Renders a real <a href>, so the browser shows the target URL on
   // hover (status bar) and middle/ctrl-click still works like a native link.
   render(props = {}) {
      const { path = '#', classes = '', text = '', icon = '', iconSize = 20, iconColor = '', sub = '' } = props;
      const anchor = document.createElement('a');
      anchor.setAttribute('href', path);
      anchor.setAttribute('data-route', '');
      if (classes) anchor.className = classes;

      if (icon) {
         const iconEl = document.createElement('span');
         iconEl.className = 'slice-link-icon';
         iconEl.setAttribute('aria-hidden', 'true');
         const svg = this._svg(icon, iconSize, iconColor);
         if (svg) iconEl.insertAdjacentHTML('afterbegin', svg);
         anchor.appendChild(iconEl);
      }

      if (sub) {
         const title = document.createElement('span');
         title.className = 'slice-link-title';
         title.textContent = text;
         anchor.appendChild(title);
         const subEl = document.createElement('span');
         subEl.className = 'slice-link-sub';
         subEl.textContent = sub;
         anchor.appendChild(subEl);
      } else {
         anchor.appendChild(document.createTextNode(text));
      }

      this.replaceChildren(anchor);
   }

   _svg(name, size, color) {
      try {
         return slice.getComponent('IconProvider').svg(name, size, color);
      } catch {
         return '';
      }
   }
}

customElements.define('slice-link', Link);
