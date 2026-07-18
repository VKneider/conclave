export default class TestHarness extends HTMLElement {
   constructor() {
      super();
      slice.attachTemplate(this);
      this.$root = this.querySelector('[data-test-root]');
   }

   async init() {
      window.__sliceTestRoot = this.$root;
   }
}

customElements.define('slice-test-harness', TestHarness);
