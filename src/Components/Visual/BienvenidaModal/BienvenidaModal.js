// Mensaje de bienvenida de la Plantilla, mostrado a quien la importa.
//
// El autor lo escribe una vez en PlantillaBuilderView; viaja dentro de la
// Plantilla (enlace, archivo .plantilla y backup) y este modal es el momento
// en que quien la recibe lo lee, justo antes de empezar a responder. Si
// después quiere releerlo, queda en el banner de RespuestasView.
//
// Provider Service lazy (GOTCHAS §10): el <slice-modal> se construye en el
// primer show(), no en init() — la mayoría de las sesiones nunca importa una
// Plantilla con mensaje. El guard es la PROMESA en vuelo, no un booleano
// (GOTCHAS §17), para que dos show() concurrentes no construyan dos modales.
export default class BienvenidaModal extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this._modalPromise = null;
    slice.controller.setComponentProps(this, props || {});
  }

  async _ensureModal() {
    if (!this._modalPromise) this._modalPromise = this._buildModal();
    await this._modalPromise;
  }

  async _buildModal() {
    this.$modal = await slice.build('Modal', {
      sliceId: 'bienvenidaDialog',
      title: 'Te compartieron una Plantilla',
      dismissable: true,
    });
    this.$modal.classList.add('bienvenida-modal');
    document.body.appendChild(this.$modal);

    this.$plantilla = document.createElement('p');
    this.$plantilla.className = 'bienvenida-modal__plantilla';
    this.$modal.appendBody(this.$plantilla);

    this.$autor = document.createElement('p');
    this.$autor.className = 'bienvenida-modal__autor';
    this.$modal.appendBody(this.$autor);

    // Región de HTML puro, sin componentes Slice adentro: innerHTML es el
    // mecanismo correcto acá (COMPONENT-PATTERNS §innerHTML vs reconcile).
    this.$mensaje = document.createElement('div');
    this.$mensaje.className = 'bienvenida-modal__mensaje';
    this.$modal.appendBody(this.$mensaje);

    this.$closeBtn = await slice.build('Button', {
      value: 'Cerrar',
      variant: 'ghost',
      onClick: () => { this.$modal.open = false; },
    });
    this.$startBtn = await slice.build('Button', {
      value: 'Empezar a responder',
      variant: 'filled',
      icon: { name: 'pen', size: '14' },
      onClick: () => this._start(),
    });
    this.$modal.appendFooter(this.$closeBtn);
    this.$modal.appendFooter(this.$startBtn);
  }

  // `navigateOnStart: false` para quien ya está donde quiere estar — importar
  // una Plantilla DESDE el builder, o previsualizar el mensaje mientras se
  // escribe: en ambos casos se está editando, no respondiendo, y un botón que
  // manda a /mis-respuestas expulsaría de la vista en la que se trabajaba.
  //
  // La vista previa del builder entra por acá a propósito, en vez de tener su
  // propio renderizador: así lo que ve el autor es, por construcción, lo mismo
  // que verá quien reciba la Plantilla — incluido el saneado, que es donde un
  // preview paralelo mentiría (mostraría estilos o enlaces que luego se caen).
  // El único cambio en modo vista previa es el título y el botón del pie: el
  // cuerpo es idéntico al real a propósito, para que el autor vea exactamente
  // lo que verá el otro y no una versión anotada.
  async show({ navigateOnStart = true, titulo = 'Te compartieron una Plantilla' } = {}) {
    const plantilla = slice.getComponent('PlantillaService');
    const mensaje = plantilla.getBienvenida();
    // Sin mensaje no hay nada que mostrar — se evita incluso construir el
    // modal, así el llamador puede invocar show() sin preguntar antes.
    if (!mensaje.trim()) return;

    await this._ensureModal();
    const html = slice.getComponent('HtmlService');

    this.$modal.title = titulo;

    const nombre = plantilla.getNombre();
    this.$plantilla.textContent = nombre || 'Plantilla sin nombre';
    this.$plantilla.hidden = false;

    const autor = plantilla.getCreadoPor();
    const email = plantilla.getCreadoEmail();
    this.$autor.textContent = autor ? `Creada por ${autor}${email ? ` (${email})` : ''}` : '';
    this.$autor.hidden = !autor;

    // El mensaje es HTML escrito en OTRO dispositivo. PlantillaService ya lo
    // limpia al importarlo; se vuelve a limpiar acá porque esta es la línea
    // que efectivamente lo inyecta en el DOM.
    this.$mensaje.innerHTML = html.sanitizeRichText(mensaje);

    this.$startBtn.value = navigateOnStart ? 'Empezar a responder' : 'Entendido';
    this._navigateOnStart = navigateOnStart;
    this.$closeBtn.hidden = !navigateOnStart;

    this.$modal.open = true;
  }

  _start() {
    this.$modal.open = false;
    if (this._navigateOnStart) slice.router.navigate('/mis-respuestas');
  }
}

customElements.define('slice-bienvenidamodal', BienvenidaModal);
