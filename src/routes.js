// App Shell + MultiRoute. Every section URL renders AppShell, which swaps the
// content area via an internal MultiRoute mirroring these same paths.
// Dynamic params use ${name} (NOT :name). Keep the 404 route last.
const routes = [
   { path: '/__test',        component: 'TestHarness', metadata: { title: 'Test Harness' } },
   { path: '/',              component: 'AppShell', metadata: { title: 'Inicio | Conclave' } },
   { path: '/dashboard',     component: 'AppShell', metadata: { title: 'Dashboard | Conclave' } },
   { path: '/mis-respuestas', component: 'AppShell', metadata: { title: 'Mis respuestas | Conclave' } },
   { path: '/comparar',      component: 'AppShell', metadata: { title: 'Comparar | Conclave' } },
   { path: '/resumen',       component: 'AppShell', metadata: { title: 'Resumen final | Conclave' } },
   { path: '/plantilla',     component: 'AppShell', metadata: { title: 'Plantilla | Conclave' } },
   { path: '/404',           component: 'NotFound', metadata: { title: '404 | Conclave' } }
];

export default routes;
