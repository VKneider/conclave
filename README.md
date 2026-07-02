<p align="center">
  <img src="src/images/og-image.png" alt="Conclave" width="120" />
</p>

# Conclave

Herramienta para tomar decisiones grupales estructuradas: un líder arma una **Plantilla**, cada persona responde por su cuenta, y después comparan e importan las respuestas de todos para decidir juntos — sin necesidad de coordinar en tiempo real.

## Cómo funciona

1. **Diseñá tu Plantilla** — Categorías y Opciones, o preguntas de texto libre. El líder arma el setup una vez.
2. **Cada quien responde** — a su manera, en su propio dispositivo, sin coordinar en tiempo real.
3. **Comparen y decidan** — importen las Respuestas de todos y vean coincidencias, diferencias e ideas juntos.

## Casos de uso

- **Asignación de equipos** — cada organizador asigna personas a equipos con su propio criterio. Comparen las listas y decidan la versión final juntos.
- **Ponentes y exposiciones** — mismo flujo, otro contexto: asignen quién expone qué tema, propongan por separado y reconcilien en la reunión.
- **Generación de ideas** — cada persona escribe su propuesta en texto libre frente a un problema común. Compárenlas en cards grandes y elijan la mejor.

Los tres casos usan el mismo modelo genérico: una Categoría (un equipo, una charla, una pregunta) está en modo **Selección** (se le asignan Opciones — personas, temas) o modo **Texto libre** (cada quien escribe su propia respuesta). Una Plantilla puede mezclar ambos modos libremente.

## Stack

Construido con [Slice.js](https://slicejs.com) (`slicejs-web-framework` 3.5.2). Todo el dato vive en el browser (`localStorage` + datos de ejemplo incluidos): no hay backend de datos ni se planea agregar uno — `api/` es solo un server estático/SPA-fallback para producción (ver `AGENTS.md` §Vercel deployment).

Slice.js por [@VKneider](https://github.com/VKneider).

## Correr el proyecto

Requiere Node ≥ 20 y [pnpm](https://pnpm.io/) (versión pineada en `package.json`).

```bash
pnpm install
pnpm run dev              # servidor de desarrollo (puerto 3001 por defecto)
```

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
