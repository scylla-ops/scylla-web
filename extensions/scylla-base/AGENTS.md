# `scylla-base` — agent guide

The base extension: the Scylla product — its 14 features, its access control, its context,
its gRPC transport, and the shell parts that fill the core's frame.

**Package** `extensions/scylla-base` (`@scylla/base`) · aliases `@base/*`, `@platform/*`,
`@shared/*` — **for scylla-base only**

## Import rules

- May import `@scylla/core-sdk` and `@scylla/ui`. **Never `@scylla/core`, never another
  extension** (`extension-uses-sdks`, error).
- Other extensions reach it through [`@scylla/base-sdk`](../../sdks/scylla-base-sdk/AGENTS.md),
  never `@scylla/base` (`sdk-is-the-door`, error). `apps/web` imports only its root:
  `ScyllaBaseExtension`.
- Inside, the module rules of `CLAUDE.md` hold: features through their `index.ts`, platform
  through its `index.ts`, `shared/` knows nobody, `domain/` is pure.

## Layout

```
src/
  index.ts                       ScyllaBaseExtension — the only export of @scylla/base's root
  scylla-base.extension.ts       @Extension({ id, name, version, modules, catalogs })
  features/<14>/                 the business modules, each with its AGENTS.md
  platform/authz, context, grpc  cross-cutting capabilities, below the features
  shared/                        shared code with a business meaning
  shell/                         modules.ts, ShellModule, the Scylla shell parts
  generated/                     protobuf-ts clients (`pnpm gen-proto`, never edited)
```

`package.json` exports `.` (the extension), `./features/*` and `./platform/*` (the barrels),
and `./scylla-result`. Only `@scylla/base-sdk` imports the subpaths.

## The extension

```typescript
@Extension({
  id: 'scylla-base',
  name: 'Scylla',
  version: '0.4.0',
  modules: [ShellModule, ...modules],
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class ScyllaBaseExtension {}
```

- **A new feature** = its folder + its `*.module.ts` in `shell/modules.ts`. Nothing here.
- **A new mount, sidebar section or shell part** = `shell/shell.module.ts`.
- The `catalogs` glob finds every catalog of the extension: a new feature's catalog needs only
  its entry in `lingui.config.js`.

## Rules that bite here

- `platform/authz` registers `Permission` as the route permission type (`Register`, in
  `presentation/authorization.ts`). No other extension may register another one.
- A feature barrel exported through `@scylla/base-sdk` is a public API for other extensions.
  A query it exports must check its own permission (rule 3 of
  `shell/__test__/feature-permissions.test.ts`).

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
