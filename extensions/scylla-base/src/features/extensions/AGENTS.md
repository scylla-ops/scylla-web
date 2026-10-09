# `features/extensions` — agent guide

The page that lists the extensions the app runs.

**Layer** `features/` · **id** `extensions` · **DI key** `extensionRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`, `@scylla/core-sdk`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type InstalledExtension
extensionQueries, EXTENSIONS_QUERY_KEY
```

Never add: `extensions.module.ts`, pages, components.

## Data contract

`ExtensionRepository` — `domain/repository/extension.repository.ts`:

| Method | Returns |
|---|---|
| `getInstalledExtensions()` | `ScyllaResult<InstalledExtension[]>`, in load order |

## Where the data comes from

The core owns the list: `startCore` calls `setInstalledExtensions` with the manifests it loaded.
`DefaultExtensionRepository` receives `installedExtensions` from `@scylla/core-sdk` and maps
each `ExtensionManifest` to an `InstalledExtension` (module count, page count).

The core cannot own the page: it has no mount, and it does not know the `Permission` type.
So the data comes from the core and the page stays here.

When install / enable / disable arrive, the backend holds that state. Add a data source and a
mapper in `infrastructure/`, and a mutation in `extensions.queries.ts`. The core reads the
enabled list before `loadExtensions`; this page only writes it.

## Layout

```
extensions.module.ts                     route + nav + DI wiring (private; registry only)
index.ts                                 public API
domain/
  structs/installed-extension.struct.ts  InstalledExtension
  repository/extension.repository.ts     ExtensionRepository
infrastructure/repository/default-extension.repository.ts   reads the core, counts the pages
presentation/
  extensions.queries.ts                  the list read (`staleTime: Infinity`)
  ui/Extensions/Extensions.page.svelte   the grid of cards (+ its test)
  ui/ExtensionCard.svelte                one extension
  ui/extensions.messages.ts
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `organization` | `extensions` | none (in `UNGATED_PAGES`) | `ExtensionsPage` |

Sidebar: section `system`, order `30`, icon `PuzzleIcon`.

## Rules that bite here

- **Read `installedExtensions` per call.** The module file loads before `startCore` installs
  the list. The repository receives the function, not its result.
- **The page has no permission yet.** It is listed in `UNGATED_PAGES`
  (`apps/web/src/__test__/module-permissions.test.ts`). Declare one, and remove the entry, when a
  mutation arrives.
- `Active` has the `feminine` context: "une extension active", not "Actif" as for the agents.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean. New strings: `pnpm extract && pnpm compile`.
