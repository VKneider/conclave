export default class ProfileBubble extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);

    this.$bubble = this.querySelector('.bubble');
    this._modal = null;

    this.$bubble.addEventListener('click', () => this._openModal());

    slice.controller.setComponentProps(this, props);
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
    this._buildContent();
  }

  _buildContent() {
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

    const visitBtn = document.createElement('button');
    visitBtn.className = 'btn btn-primary';
    visitBtn.textContent = 'Visitar mi portfolio →';
    visitBtn.addEventListener('click', () => {
      window.open('https://vkneider.dev', '_blank', 'noopener');
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
