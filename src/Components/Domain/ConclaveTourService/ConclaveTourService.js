// App-wide onboarding tours. Owns the step scripts and wraps the registry
// TourService so views only call startTour(name).
//
// Native TourService ends on route change. The multi-view tour keeps the run
// alive (stopOnRouteChange: false) and separates each screen into:
//   - a guide step that spotlights the real nav tab and waits for the click,
//   - the destination chapter, resolved only after the route changes.
// Nothing navigates behind the user's back: the only programmatic jump is the
// explicit "Ir ahora" fallback on the guide card.
const TEXTS = {
  next: 'Siguiente',
  back: 'Atrás',
  skip: 'Saltar',
  done: 'Listo',
  close: 'Cerrar',
  progress: 'Paso {index} de {total}',
  preparing: 'Preparando…',
  missing: 'No encontramos esta parte de la app.',
};

export default class ConclaveTourService {
  constructor(props) {
    this.props = props || {};
    this._tour = null;
    this._starting = null;
  }

  async init() {
    this._tour = await slice.build('TourService', { singleton: true, sliceId: 'appTour' });
  }

  async startTour(name = 'full') {
    const script = TOURS[name];
    if (!this._tour || !script) return { completed: false, reason: 'error' };
    if (this._starting) return this._starting;

    this._starting = this._run(script).finally(() => { this._starting = null; });
    return this._starting;
  }

  async _run(script) {
    const steps = script.map((step) => {
      if (step.type === 'guide') return this._guide(step);
      return step.route ? this._withRoute(step) : step;
    });
    const multiRoute = steps.some((step) => step.route);

    return this._tour.start(steps, {
      texts: TEXTS,
      maxCardWidth: 340,
      stopOnRouteChange: !multiRoute,
      // A route swap already changes the scene; gliding the old card across
      // it reads as a glitch, so multi-route tours commit positions instantly.
      animate: !multiRoute && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
  }

  // Resolve a chapter's `route` into a beforeStep + waitFor pair. Reached by
  // the guide click, the path already matches; reached via "Ir ahora", this is
  // the explicit navigation.
  _withRoute(step) {
    const original = step.beforeStep;
    return {
      ...step,
      beforeStep: async (context) => {
        if (window.location.pathname !== step.route) {
          await slice.router.navigate(step.route);
        }
        return original?.(context);
      },
      waitFor: step.waitFor ?? (typeof step.target === 'string' ? step.target : undefined),
      fallback: step.fallback ?? 'center',
      timeout: step.timeout ?? 6000,
    };
  }

  // A guide step: spotlight the real nav control, keep the page clickable and
  // advance only when the destination route is reached. "Ir ahora" is the
  // explicit fallback for people who prefer a button.
  _guide({ route, label, title, hint }) {
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const instruction = mobile
      ? `Abre el menú (arriba a la derecha) y elige ${label}.`
      : `Haz clic en la pestaña ${label}, arriba.`;
    return {
      target: () => this._navTarget(route),
      interactive: true,
      placement: 'bottom',
      padding: 4,
      title,
      content: `${instruction} ${hint}`,
      texts: { next: 'Ir ahora' },
      beforeStep: ({ tour, index, signal }) => {
        // Reached by Back while already on the destination: the guide is
        // redundant, let TourService step over it.
        if (window.location.pathname === route) return false;
        this._armRouteAdvance(tour, index, route, signal);
      },
    };
  }

  // The tab is visible on desktop; on mobile the same destination lives inside
  // the hamburger menu, so point at the control that actually exists.
  _navTarget(route) {
    const tab = document.querySelector(`.topbar .tab[data-path="${route}"]`);
    const visible = tab && tab.getClientRects().length > 0 && getComputedStyle(tab).visibility !== 'hidden';
    return visible ? tab : document.querySelector('.topbar .hamburger');
  }

  // Advance the tour once router:change lands on the guide's destination.
  // next() is ignored while a step is preparing, so retry briefly.
  _armRouteAdvance(tour, index, route, signal) {
    let timer = null;
    let subscription = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (subscription) slice.events.unsubscribe('router:change', subscription);
      subscription = null;
    };

    const tryAdvance = () => {
      if (signal.aborted || !tour.isActive || tour.index !== index) { cleanup(); return; }
      if (window.location.pathname !== route) return;
      tour.next();
      if (tour.index === index) timer = setTimeout(tryAdvance, 120);
      else cleanup();
    };

    subscription = slice.events.subscribe('router:change', tryAdvance);
    signal.addEventListener('abort', cleanup, { once: true });
    // The click may have landed before the subscription was armed.
    tryAdvance();
  }
}

const TOURS = {
  // Short, manual intro. Available from UserMenu; never auto-started.
  landing: [
    {
      target: '.topbar',
      placement: 'bottom',
      padding: 6,
      title: 'Todo el flujo, siempre a mano',
      content: 'Dashboard, Mis respuestas, Comparar, Resumen y Plantilla viven en estas pestañas. En el celular se abren desde el menú.',
    },
    {
      target: '.landing-cta-row',
      placement: 'bottom',
      title: 'Empieza por la Plantilla',
      content: 'Una persona arma los temas y sus opciones. Después cada quien responde por su cuenta, sin coordinar horarios.',
    },
    {
      target: '.landing-actions',
      placement: 'top',
      padding: 10,
      title: 'Cuatro atajos al mismo flujo',
      content: 'Plantilla para definir, Responder para tu propuesta, Comparar para reunir respuestas y Dashboard para ver el avance.',
    },
    {
      target: '.story-cycle',
      placement: 'top',
      padding: 10,
      title: 'El ciclo completo',
      content: 'Armar, responder, comparar y decidir. Cada etapa tiene su vista y puedes volver a cualquiera cuando quieras.',
    },
    {
      target: '.user-menu__trigger',
      placement: 'bottom',
      title: 'Tu espacio',
      content: 'Aquí pones tu nombre, cambias el tema y compartes, importas o respaldas tus respuestas.',
    },
  ],

  // The full walkthrough. Every screen is introduced by a guide step that asks
  // for the real click on the tab; the chapter that follows explains the work
  // done there.
  full: [
    {
      target: '.topbar',
      placement: 'bottom',
      padding: 6,
      title: 'Un recorrido por Conclave',
      content: 'Te voy a pedir que hagas clic en cada pestaña, como lo harías tú. El recorrido sigue cuando llegues; no vas a saltar de vista sin avisar.',
    },
    {
      type: 'guide',
      route: '/plantilla',
      label: 'Plantilla',
      title: 'Vamos a la Plantilla',
      hint: 'Ahí se define una sola vez lo que el grupo va a responder.',
    },
    {
      route: '/plantilla',
      target: '.pb-add-row--tema',
      placement: 'top',
      title: 'Así se agrega un tema',
      content: 'Escribe la pregunta, elige su modo — asignación, votación, ranking o texto libre — y pulsa Agregar. Las opciones del pool se cargan más abajo.',
    },
    {
      target: '#sharePlantillaBtnSlot',
      placement: 'bottom',
      title: 'Comparte cuando esté lista',
      content: 'Con Compartir plantilla envías un enlace o un archivo. Cada persona la importa y responde en su propio dispositivo.',
    },
    {
      type: 'guide',
      route: '/mis-respuestas',
      label: 'Mis respuestas',
      title: 'Ahora te toca responder',
      hint: 'Es tu espacio personal: nadie más ve lo que eliges hasta que compartas.',
    },
    {
      route: '/mis-respuestas',
      target: '.av-slots',
      placement: 'top',
      padding: 10,
      title: 'Responde tema por tema',
      content: 'Usa el carrusel o el tablero. El botón Siguiente te lleva al próximo tema y tu avance se guarda solo.',
    },
    {
      target: '.av-header__actions',
      placement: 'bottom',
      title: 'Comparte tus respuestas',
      content: 'Cuando termines, usa Compartir respuestas. El grupo las importa en Comparar para verlas al lado de las suyas.',
    },
    {
      type: 'guide',
      route: '/comparar',
      label: 'Comparar',
      title: 'Reúne lo de todos',
      hint: 'Ahí se juntan las respuestas de cada persona, sin editar las ajenas.',
    },
    {
      route: '/comparar',
      target: '.cmp-import-slot',
      placement: 'bottom',
      title: 'Importa las respuestas',
      content: 'Arrastra los archivos o pega los enlaces compartidos. Puedes importar varias personas a la vez.',
    },
    {
      target: '.cmp-toolbar',
      placement: 'bottom',
      title: 'Compara y decide',
      content: 'Filtra por diferencias o coincidencias, revisa tema por tema y prepara la decisión final del grupo.',
    },
    {
      type: 'guide',
      route: '/resumen',
      label: 'Resumen',
      title: 'Cierra la decisión',
      hint: 'Es la vista donde el grupo deja escrita la decisión y la minuta.',
    },
    {
      route: '/resumen',
      target: '.rf-toolbar',
      placement: 'bottom',
      title: 'La minuta y el consenso',
      content: 'Comparte las decisiones, importa un consenso o expórtalo. Lo acordado queda en un solo lugar para volver cuando quieras.',
    },
    {
      type: 'guide',
      route: '/dashboard',
      label: 'Dashboard',
      title: 'Mira el avance',
      hint: 'Antes de cerrar, aquí ves quién respondió y qué temas siguen pendientes.',
    },
    {
      route: '/dashboard',
      target: '.stat-grid',
      placement: 'bottom',
      title: 'Progreso y pendientes',
      content: 'El progreso, los temas y las respuestas se actualizan en vivo. Si algo está pendiente, todavía hay tiempo de recordarlo.',
    },
    {
      target: '.user-menu__trigger',
      placement: 'bottom',
      title: 'Tu espacio',
      content: 'Tu nombre, el tema, el sonido y tus respuestas: compartir, importar o respaldar. Desde aquí también puedes repetir este recorrido.',
    },
  ],

  // Contextual chapter for the response screen. Used by the welcome modal
  // (someone just imported a Plantilla) and by RespuestasView's help button.
  respuestas: [
    {
      route: '/mis-respuestas',
      target: '.av-header',
      placement: 'bottom',
      title: 'Responder, paso a paso',
      content: 'Este es tu espacio para completar la Plantilla. Al terminar, comparte tus respuestas para que el grupo las compare.',
    },
    {
      target: '.av-slots',
      placement: 'top',
      padding: 10,
      title: 'Responde y avanza',
      content: 'Usa el carrusel o el tablero. El botón Siguiente te lleva al próximo tema y tu avance se guarda solo.',
    },
    {
      target: '.user-menu__trigger',
      placement: 'bottom',
      title: 'Comparte al terminar',
      content: 'Desde tu menú compartes tus respuestas, las importas en otro dispositivo o descargas un respaldo.',
    },
  ],
};
