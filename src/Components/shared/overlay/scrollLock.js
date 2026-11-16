// One page-scroll lock shared by every overlay (Modal, Lightbox, TourService…), so stacked
// layers do not fight over it: the page is locked while at least one holder
// holds it, and comes back to the same scroll position when the last lets go.
//
//   const release = lockScroll();
//   …
//   release();   // idempotent
//
// position: fixed on <body> (not overflow: hidden), so Chrome does not
// propagate overflow to the viewport and reset scrollY to 0.

let holders = 0;
/** @type {{ scrollY: number, position: string, top: string, width: string } | null} */
let saved = null;

/** Lock the page's scroll. Returns the function that releases this hold. */
export function lockScroll() {
   holders += 1;
   if (holders === 1) {
      const body = document.body;
      saved = { scrollY: window.scrollY, position: body.style.position, top: body.style.top, width: body.style.width };
      body.style.position = 'fixed';
      body.style.top = `-${saved.scrollY}px`;
      body.style.width = '100%';
   }
   let released = false;
   return () => {
      if (released) return;
      released = true;
      holders = Math.max(0, holders - 1);
      if (holders === 0 && saved) {
         const { scrollY, position, top, width } = saved;
         saved = null;
         document.body.style.position = position;
         document.body.style.top = top;
         document.body.style.width = width;
         window.scrollTo(0, scrollY);
      }
   };
}

/** How many holders the lock has (for tests and debugging). */
export function scrollLockHolders() {
   return holders;
}
