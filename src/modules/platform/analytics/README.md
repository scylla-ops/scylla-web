# platform / analytics

> [Scylla frontend](../../../../README.md) › `platform/` › **analytics** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../docs/architecture.md)

The team runs a self-hosted [Umami](https://umami.is/) instance for backend tracking, and this
capability wires the frontend into the same dashboard: automatic pageviews on every route change,
and `trackEvent` for the business events a feature chooses to log.

Imported as `@platform/analytics`: `initAnalytics` (called once at bootstrap) and `trackEvent`
(called from a feature).

## Why this is `platform/`, not `shared/`

Analytics is cross-cutting — any feature may want to log an event — but it is not generic UI or a
pure utility either, so `shared/` is the wrong home. It sits beside `grpc` and `context` as a
capability every feature may depend on, and that may never depend on one.

## Production only, no feature-flag system needed

The script only loads when `import.meta.env.PROD` is true and both `VITE_UMAMI_SRC` and
`VITE_UMAMI_WEBSITE_ID` are set. `PROD` is Vite's own build-mode flag — true for a production
build no matter which `.env` file is loaded — so local development and CI runs never show up in
the dashboard, without building a bespoke on/off switch for it.

The real `VITE_UMAMI_SRC` / `VITE_UMAMI_WEBSITE_ID` values belong wherever the production image is
actually built (CI secrets, a Dockerfile env), not in a file committed to this repo — the same
split `VITE_API_URL` already uses between local dev and a deployed instance.

## One script tag, not a tracked component

`initAnalytics` injects the Umami `<script>` directly into `document.head` once, outside Svelte's
lifecycle, the same way `startRouter()` runs once before the app mounts. Umami's tracker script
auto-detects `history.pushState`/`replaceState` navigation on its own, so a single script tag is
expected to produce one pageview per SPA route change with no Svelte code watching the router —
this is worth a manual check on a production build before relying on it for real numbers, and the
fallback (an effect over `@platform/routing`'s `routePathname()`, mirroring `AuthGuard`) is noted
in [the agent guide](./AGENTS.md) if the check fails.

## Structure

A single implementation file and a barrel, no `domain/`/`presentation/` split — the same
minimalism as `platform/context` and `platform/di`. There is exactly one provider to wrap; a
layered structure would be scaffolding for a capability that does not need it.

## Related modules

- [core](../../core/README.md) — `src/main.ts` calls `initAnalytics()` once, before mount.
- [platform/routing](../routing/README.md) — the fallback pageview tracking would read
  `routePathname()` from here.
