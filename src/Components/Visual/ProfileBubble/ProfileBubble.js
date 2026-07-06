const DISMISS_KEY = 'conclave-profile-dismissed';

export default class ProfileBubble extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);

    this._modal = null;

    this.querySelector('.bubble').addEventListener('click', () => this._openModal());
    this.querySelector('.bubble-dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      this._dismiss();
    });

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._boundCheck = () => this._checkVisibility();
    this._checkVisibility();
    window.addEventListener('popstate', this._boundCheck);
    slice.events.subscribe('router:change', this._boundCheck);
  }

  async update() {
    this._checkVisibility();
  }

  beforeDestroy() {
    window.removeEventListener('popstate', this._boundCheck);
    slice.events.unsubscribe('router:change', this._boundCheck);
  }

  _checkVisibility() {
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    const onLanding = window.location.pathname === '/';
    this.hidden = dismissed || !onLanding;
  }

  _dismiss() {
    localStorage.setItem(DISMISS_KEY, 'true');
    this.hidden = true;
  }

  async _ensureModal() {
    if (this._modal) return;
    this._modal = await slice.build('Modal', {
      sliceId: 'profile-bubble-modal',
      title: '👋 ¡Hola!',
      dismissable: true,
      maxWidth: '420px',
    });
    document.body.appendChild(this._modal);
    await this._buildContent();
  }

  async _buildContent() {
    const body = document.createElement('div');
    body.className = 'profile-bubble__body';

    const greeting = document.createElement('p');
    greeting.className = 'profile-bubble__greeting';
    greeting.textContent = 'Soy Victor Kneider';
    body.appendChild(greeting);

    const text = document.createElement('p');
    text.className = 'profile-bubble__text';
    text.textContent = 'Ingeniero de computación, diseño y arquitectura de software profesional. Creador de Slice.js y Conclave.';
    body.appendChild(text);

    const links = document.createElement('div');
    links.className = 'profile-bubble__links';

    links.appendChild(this._createLink('🌐', 'Portfolio personal', 'https://vkneider.dev'));
    links.appendChild(this._createLink('⚡', 'Slice.js — framework web', 'https://slicejs.com'));
    links.appendChild(this._createLink('🧩', 'Componentes Slice', 'https://components.slicejs.com'));

    body.appendChild(links);

    const footer = document.createElement('p');
    footer.className = 'profile-bubble__footer-text';
    footer.textContent = 'Hecho con 💙 y Slice.js';
    body.appendChild(footer);

    this._modal.appendBody(body);

    const visitBtn = await slice.build('Button', {
      value: 'Visitar mi portfolio \u2192',
      variant: 'filled',
      onClick: () => {
        window.open('https://vkneider.dev', '_blank', 'noopener');
      }
    });
    this._modal.appendFooter(visitBtn);
  }

  _createLink(emoji, label, url) {
    const a = document.createElement('a');
    a.className = 'profile-bubble__link';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    const icon = document.createElement('span');
    icon.className = 'profile-bubble__link-icon';
    icon.textContent = emoji;
    a.appendChild(icon);

    const text = document.createTextNode(label);
    a.appendChild(text);

    return a;
  }

  async _openModal() {
    await this._ensureModal();
    this._modal.open = true;
  }
}

customElements.define('slice-profile-bubble', ProfileBubble);
