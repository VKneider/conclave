export default class TestHarness extends HTMLElement {
   constructor() {
      super();
      slice.attachTemplate(this);
      this.$root = this.querySelector('[data-test-root]');
   }

   async init() {
      // Arranca los singletons antes de exponer la raíz de montaje, igual que
      // hace AppShell en la app real.
      //
      // Sin esto, un componente montado acá recibe `undefined` de
      // slice.getComponent('HtmlService') y demás, y revienta en cuanto los
      // usa — pero de forma silenciosa: el fallo aparece dentro de un método
      // async al que el test no le hace await, así que el spec sólo ve que su
      // selector nunca aparece. Todo Visual de este repo asume que Providers
      // ya arrancó (ver docs/COMPONENT-PATTERNS.md §Core services), así que el
      // harness tiene que ofrecer ese mismo entorno o no está probando la app.
      await slice.build('Providers', { singleton: true });
      window.__sliceTestRoot = this.$root;
   }
}

customElements.define('slice-test-harness', TestHarness);
