<p align="center">
  <img src="src/images/og-image.png" alt="Conclave" width="120" />
</p>

# Conclave

Herramienta para tomar decisiones grupales estructuradas: un líder arma una **Plantilla**, cada persona responde por su cuenta, y después comparan e importan las respuestas de todos para decidir juntos — sin necesidad de coordinar en tiempo real.

## Cómo funciona

1. **Arma tu Plantilla** — suma **Temas** y elige el modo de cada uno (asignación, votación, ranking o texto libre). El líder arma el setup una vez; puedes empezar desde un ejemplo.
2. **Cada quien responde** — a su manera, en su propio dispositivo, sin coordinar en tiempo real.
3. **Comparen y decidan** — importen las Respuestas de todos y vean coincidencias, mayorías e ideas — y fijen la decisión final juntos.

## Modos (un Tema por decisión)

- **🎯 Asignación** — reparte un pool de personas/ítems entre equipos con cupos mín/máx. Comparen las listas y decidan la versión final.
- **🗳️ Votación** — una pregunta con varias opciones; cada quien elige una y gana la mayoría (incluye Sí/No).
- **🏆 Ranking** — ordena un conjunto de opciones por prioridad; se agregan los órdenes de todos (Borda) para un ranking de consenso.
- **📝 Lluvia de ideas** — preguntas abiertas de texto libre; cada persona escribe su propuesta y se comparan lado a lado.

Una misma Plantilla puede **mezclar modos** — por ejemplo una votación de fecha, un ranking de prioridades y una pregunta abierta, todo junto.

## Stack

Construido con [Slice.js](https://slicejs.com) (`slicejs-web-framework` 3.5.2). Todo el dato vive en el browser (`localStorage` + datos de ejemplo incluidos): no hay backend de datos ni se planea agregar uno — `api/` es solo un server estático/SPA-fallback para producción (ver `AGENTS.md` §Vercel deployment).

Slice.js por [@VKneider](https://github.com/VKneider).

## Correr el proyecto

Requiere Node ≥ 20 y [pnpm](https://pnpm.io/) (versión pineada en `package.json`).

```bash
pnpm install
pnpm run dev              # servidor de desarrollo (puerto 3001 por defecto)
```

> **Importante:** Este branch requiere el CLI en la rama [`fix/vendor-shared-module-imports`](https://github.com/VKneider/slicejs-cli/tree/fix/vendor-shared-module-imports) de `slicejs-cli`. El `icons.js` usa imports individuales de `lucide`, y el CLI necesita el fix de propagación de `moduleImports` en el pipeline vendor-shared para no producir `ReferenceError: lucide is not defined`. Antes de hacer `pnpm run dev` o `pnpm run build`, asegurate de que el CLI instalado tenga ese fix:
>
> ```bash
> cd node_modules/slicejs-cli
> git fetch origin fix/vendor-shared-module-imports
> git checkout fix/vendor-shared-module-imports
> ```

Otros comandos útiles:

```bash
pnpm run slice:doctor     # diagnóstico estructural — correr después de agregar/quitar/renombrar componentes
pnpm run build            # build de producción
pnpm run component:create <Nombre> --category <Visual|Service|AppComponents|DataDisplay>
```

## Documentación

Este README es la puerta de entrada; la documentación real vive en:

| Archivo | Qué cubre |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Servicios, vistas, boot order, flujo de datos |
| [`docs/DATA.md`](docs/DATA.md) | Formato de Plantilla/Respuestas, shapes de Categoría/Opción, storage keys |
| [`docs/FEATURES.md`](docs/FEATURES.md) | Cómo funciona cada vista/feature en detalle |
| [`docs/UX.md`](docs/UX.md) | Estándares de interacción y animación |
| [`docs/GOTCHAS.md`](docs/GOTCHAS.md) | Trampas del framework y bugs no obvios — leer antes de cualquier cambio estructural |
| [`DESIGN.md`](DESIGN.md) | Lenguaje visual "Sticker Book" — leer antes de cualquier cambio de CSS |
| [`AGENTS.md`](AGENTS.md) | Notas operativas para quien (humano o agente) retome el código: qué leer para cada tarea, decisiones de producto no obvias, deployment |
