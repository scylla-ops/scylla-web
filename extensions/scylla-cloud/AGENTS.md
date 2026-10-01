# `scylla-cloud` — agent guide

The SaaS build: what `scylla-base` needs that only a hosted deployment offers. v1 is self-service
sign-up and nothing else — see `scylla-cloud-v1_plan.md` at the repo root for the scope and the
phases this extension was built in.

**Package** `extensions/scylla-cloud` (`@scylla/cloud`) · depends on `scylla-base`

## Import rules

- May import `@scylla/core-sdk`, `@scylla/ui` and `@scylla/base-sdk`. **Never `@scylla/core`,
  never `@scylla/base` directly, never another extension's internals**
  (`extension-uses-sdks`, `sdk-is-the-door`, error).
- Has one feature (`auth`), so it uses **relative imports** — no `@base/*`-style alias. Add one
  if a second feature makes relative paths painful.
- No SDK of its own: nothing consumes this extension yet. Add `sdks/scylla-cloud-sdk` and the
  matching `.dependency-cruiser.cjs` rules the day another extension needs to reach it.

## Layout

```
src/
  index.ts                        ScyllaCloudExtension — the only export of @scylla/cloud's root
  scylla-cloud.extension.ts       @Extension({ id, name, version, dependencies, modules, widgetInjections, catalogs })
  features/auth/                  the one feature — see its own AGENTS.md
  generated/                      protobuf-ts clients (`pnpm gen-proto`, never edited)
```

`package.json` exports only `.` — the whole extension is one entry point, unlike `scylla-base`'s
multi-subpath `exports`.

## The extension

```typescript
@Extension({
  id: 'scylla-cloud',
  name: 'Scylla Cloud',
  version: '0.1.0',
  dependencies: ['scylla-base'],
  modules: [CloudAuthModule],
  widgetInjections: [EmailLoginWidgetInjection, SignUpLinkWidgetInjection],
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class ScyllaCloudExtension {}
```

- **Modules** add pages and data (`CloudAuthModule`: the `/register` route, `registrationRepository`).
- **`widgetInjections`** change `scylla-base`'s widgets — components, texts, patches, grouped by
  intention. They are a field of `@Extension`, never of a module: full mechanism and vocabulary
  in `widgets_plan.md` at the repo root.
- `dependencies: ['scylla-base']` is load-bearing, not decorative: the loader rejects any
  `widgetInjections` entry that changes a `scylla-base` point unless this is declared
  (`widgets_plan.md` §8.1).

## Protobuf generation

`scripts/gen-proto.mjs` generates **one target per extension that talks to the backend**, each
into its own `src/generated/`, private to it:

```javascript
{ extension: 'scylla-cloud', protos: ['scylla/registration/v1', 'scylla/common/v1'] }
```

Add a proto package to this list, never a deep import into `scylla-base/src/generated/` — that
tree belongs to `scylla-base` alone, same as this one belongs to `scylla-cloud` alone.
`scylla-cloud-v1_plan.md` §2.5 has the reasoning (`common` is generated twice, on purpose, once
per extension that needs it).

## Rules that bite here

- **A widget injection lives next to the feature it serves**: `features/auth/widget-injections/`,
  not a top-level `widget-injections/`, since both existing injections (`email-login`,
  `sign-up-link`) are part of how `auth` makes a cloud account usable.
- **A `*.widget-injection.ts` is private**, like a `*.module.ts`: only
  `scylla-cloud.extension.ts` imports it, by path (`widget-injection-declaration-is-private`,
  error). Its barrel never exports it — it points to components, and a barrel export would pull
  them into every importer's chunk.
- **`openSession` from `@scylla/base-sdk` is the only way to open a session.** The gRPC
  registration data source calls it after a successful sign-up; it never writes to
  `localStorage` itself. See the login feature's `AGENTS.md` in `scylla-base`.
- **`ScyllaResult`/`ScyllaError` reach `features/auth/domain/` as a type-only import** from
  `@scylla/base-sdk` — the one import `domain-is-pure` allows across an SDK boundary, because it
  leaves no runtime trace (`.dependency-cruiser.cjs`, `domain-is-pure`).

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean. New strings: `pnpm extract && pnpm compile`. New or changed `.proto`:
`pnpm gen-proto`.
