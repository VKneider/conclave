# Domain

## What this category is

Conclave's own rules: consensus, responses, templates, export and settings. These services know the product's entities, and they are the only place where its business logic lives — the UI renders and Core stays generic.


## Components

<!-- slice:generated:components:start -->
| Component | Type | Files | Docs |
| --- | --- | --- | --- |
| ConclaveTourService | Service | 2 | — |
| ConsensoService | Service | 1 | — |
| ExportService | Service | 1 | — |
| PlantillaService | Service | 1 | — |
| RespuestasImportService | Service | 1 | — |
| RespuestasService | Service | 1 | — |
| SettingsService | Service | 1 | — |
<!-- slice:generated:components:end -->

## Local rules

- Keep this guide current when adding, removing or changing a component in this category.
- Prefer the component `README.md` for API details; link it from the table above.
- Document non-obvious decisions and gotchas here.

## Events

- Emitted and listened events are documented in `docs/events/`.
- Event names use `namespace:action`.

## Changelog

- Optional: `CHANGELOG.md` next to this file.
