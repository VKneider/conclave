# Core

## What this category is

Framework services the app runs on: fetching, storage, files, HTML, sound, tours and the store. Nothing here knows what Conclave is for — a service in this category is reusable by any Slice app, and product rules belong in Domain.


## Components

<!-- slice:generated:components:start -->
| Component | Type | Files | Docs |
| --- | --- | --- | --- |
| ChartService | Service | 1 | — |
| CompressionService | Service | 1 | — |
| DomService | Service | 1 | — |
| FetchManager | Service | 1 | — |
| FileDownloadService | Service | 1 | — |
| HtmlService | Service | 1 | — |
| IndexedDbManager | Service | 1 | — |
| LocalStorageManager | Service | 1 | — |
| SoundService | Service | 1 | — |
| StoreService | Service | 1 | — |
| TourService | Service | 1 | — |
| UrlShortenerService | Service | 1 | — |
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
