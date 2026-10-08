# `platform/analytics` — agent guide

Umami tracking: a production-only pageview script and a `trackEvent` call features use to log
business events.

**Layer** `platform/` · alias `@platform/analytics`

## Import rules

- **MUST NEVER import a feature** (`platform-knows-no-feature`, error).
- May import `@shared/*` and other platform capabilities through their `index.ts` only.
- Consumers import `@platform/analytics` — the barrel, never a deep path.

## Public API — `index.ts`

```typescript
initAnalytics()                                       called once, at app bootstrap
trackEvent(eventName: string, data?: Record<string, unknown>)   called from a feature
```

## `initAnalytics`

No-ops unless `import.meta.env.PROD` is true **and** both `VITE_UMAMI_SRC` and
`VITE_UMAMI_WEBSITE_ID` are set. When all three hold, it injects
`<script async src={VITE_UMAMI_SRC} data-website-id={VITE_UMAMI_WEBSITE_ID}>` into
`document.head`. Called once from `src/main.ts`, parallel to `startRouter()` — do not call it a
second time, and do not call it from a component or an effect.

`import.meta.env.PROD` is Vite's own build-mode flag, true for `vite build` regardless of which
`.env` file loaded. That is what keeps local dev and CI out of the dashboard without a
bespoke feature-flag mechanism.

## `trackEvent`

Calls `window.umami?.track(eventName, data)`. The optional chain makes it a safe no-op in dev, in
tests, and if an ad-blocker strips the script — a caller never needs to guard it.

**No automatic event catalog exists.** Deciding which business events a feature should fire
(`secret-created`, `pipeline-triggered`, …) is that feature's own call; this module only provides
the mechanism.

## Pageviews are not wired through the router — on purpose

Umami's tracker script auto-detects `history.pushState`/`replaceState` navigation once loaded, so
a pageview per SPA route change is expected to work from the script tag alone, with no
`routePathname()` effect. This was **not verified against this instance's specific Umami
version** — before trusting it, navigate the SPA on a production build and confirm pageviews
appear per route, not just on first load.

If it turns out the self-hosted script does not auto-track, add a small effect following
`AuthGuard`'s pattern (`core/presentation/ui/router/AuthGuard/Auth.guard.svelte`): read
`routePathname()` from `@platform/routing` inside a `$derived`/`$effect` so it re-runs on every
pathname change, and call `trackEvent` (or `window.umami?.track`) from there. Do not add this
pre-emptively — only when the check above shows it is needed.

## Layout

```
index.ts                             public API
umami.ts                             initAnalytics, trackEvent, the `Window.umami` type
__test__/umami.test.ts
```

## Rules that bite here

- **Never widen this module's scope.** It is a thin wrapper around one third-party script, not a
  general analytics abstraction — there is exactly one provider (Umami) and no plan for a second.
- **Never call `initAnalytics` more than once** or from anywhere but `src/main.ts`. It has no
  guard against double-injecting the script, because it is only ever called once.
- `trackEvent` is fire-and-forget by design: it returns `void` and never throws. Do not wrap
  calls in `ScyllaResult` or `try/catch` — there is nothing here that is actually fallible from a
  caller's perspective.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
