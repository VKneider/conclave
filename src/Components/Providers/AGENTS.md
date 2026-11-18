# Providers

## What this category is

App-wide singletons mounted once at the root: the toast and icon providers, the drag-and-drop service, and the Providers composition root. They live for the lifetime of the page and no screen owns or destroys them.


## Components

<!-- slice:generated:components:start -->
| Component | Type | Files | Docs |
| --- | --- | --- | --- |
| DragDropService | Service | 3 | — |
| IconProvider | Service | 1 | — |
| Providers | Service | 1 | — |
| ToastProvider | Service | 1 | — |
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
