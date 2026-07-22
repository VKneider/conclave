import '/Slice/Slice.js';

// `slice` is now a global. Routes are declared in /routes.js and the router
// auto-starts shortly after load, so this file can stay almost empty.
//
// Dynamic page titles on route change
slice.router.afterEach((to) => {
  document.title = to.metadata?.title ?? 'Conclave — Decisiones en equipo';
});

await slice.router.start();
