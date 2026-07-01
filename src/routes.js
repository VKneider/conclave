// App Shell + MultiRoute. Every section URL renders AppShell, which swaps the
// content area via an internal MultiRoute mirroring these same paths.
// Dynamic params use ${name} (NOT :name). Keep the 404 route last.
const routes = [
   { path: '/',              component: 'AppShell', metadata: { title: 'Conclave — Dashboard' } },
   { path: '/mi-asignacion', component: 'AppShell', metadata: { title: 'Conclave — Mi asignación' } },
   { path: '/comparar',      component: 'AppShell', metadata: { title: 'Conclave — Comparar' } },
   { path: '/ayuda',         component: 'AppShell', metadata: { title: 'Conclave — Ayuda' } },
   { path: '/configuracion', component: 'AppShell', metadata: { title: 'Conclave — Configuración' } },
   { path: '/404',           component: 'NotFound', metadata: { title: 'Not Found' } }
];

export default routes;
