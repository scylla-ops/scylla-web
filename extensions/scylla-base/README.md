# `scylla-base`

> [Scylla frontend](../../README.md) › `extensions/scylla-base` ·
> [agent guide](./AGENTS.md) · [architecture](../../docs/architecture.md)

**The Scylla product, as an extension.** Everything that a user of Scylla sees is here:
organizations, projects, pipelines and their editor, jobs and their logs, triggers, agents,
apps, secrets, roles and members. The extension also fills the frame of the core: the login
gate, the organization selector, the user menu, the access policy and the error policy.

[`@scylla/core`](../../packages/core/README.md) loads this extension like any other. It is the
*base* because other extensions build on it, through
[`@scylla/base-sdk`](../../sdks/scylla-base-sdk/README.md).

## What is inside

```
src/
  scylla-base.extension.ts   the @Extension declaration
  shell/                     the list of modules, and ShellModule: the frame around the pages
  features/                  the 14 business modules
  platform/                  authz, context, grpc: capabilities that the features use
  shared/                    code that two features share and that has a Scylla meaning
  generated/                 gRPC clients made from the .proto files (never edit)
```

| Layer | Contents |
|-------|----------|
| [`shell/`](src/shell/README.md) | The feature list and `ShellModule`: mounts, sidebar sections, access policy, error policy, shell parts. |
| [`features/`](../../README.md#scylla-base--features) | `agents`, `apps`, `dashboard`, `jobs`, `login`, `marketplace`, `membership`, `organization`, `pipeline`, `project`, `roles`, `secret`, `triggers`, `user`. |
| [`platform/authz`](src/platform/authz/README.md) | `Permission`, `can`, `Can`, `RequirePermission`: the read side of access control. |
| [`platform/context`](src/platform/context/README.md) | The active organization, project and pipeline, and navigation from them. |
| [`platform/grpc`](src/platform/grpc/README.md) | The gRPC-Web transport, with authentication. |
| [`shared/`](src/shared/README.md) | `ScyllaResult`, the presentation of a run status. |

## How it connects to the core

The extension is short. It is a list of modules:

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

**`ShellModule`** declares the structure of the app. The features attach their pages to its
four mounts:

| Mount | Path | What it adds |
|-------|------|--------------|
| `public` | `/` | Pages outside the shell, e.g. `/login`. |
| `app` | `/` | The authentication gate and the core's shell frame. |
| `organization` | `/:organizationSlug` | Writes the organization of the URL into the context. |
| `project` | `/:organizationSlug/projects/:projectId` | Clears a stale project context. Adds the "Project" breadcrumb. |

It also declares the `organization` and `system` sidebar sections, the access policy (from
`platform/authz`), the error policy (an expired session goes to `/login`, other errors show a
toast), and the fallback page.

**Each feature** declares its own routes, sidebar links and permissions in its
`<feature>.module.ts`. To add a page, you change one feature. `ShellModule` changes only for a
new mount or a new part of the frame.

## How a feature is built

Each feature uses Clean Architecture. Dependencies go in one direction only:

```
presentation  →  domain  ←  infrastructure
(Svelte, queries)   (pure TS)   (gRPC, mappers)
```

- **`domain/`** has the entities and the repository interfaces. It has no framework imports.
- **`infrastructure/`** implements the repositories over gRPC-Web and maps the proto types to
  domain types.
- **`presentation/`** has the pages, the TanStack Query factories (`*.queries.ts`) and the
  ViewModels (`*.state.svelte.ts`).
- **`index.ts`** is the public API of the feature. Other modules import only this file.

The layers of the extension also go in one direction: `shell → features → platform → shared`.
dependency-cruiser checks these rules in CI, and `pnpm depcruise:cycles` makes sure that there
are no cycles between modules. [`CLAUDE.md`](../../CLAUDE.md) has the full rules and the
checklist to add a feature.

## Public API

The package exports:

- `.` — `ScyllaBaseExtension`, for `apps/web`;
- `./features/*`, `./platform/*`, `./scylla-result` — the barrels, for `@scylla/base-sdk` only.

Other extensions use [`@scylla/base-sdk`](../../sdks/scylla-base-sdk/README.md) and never import
this package.

## Related

- [`@scylla/core`](../../packages/core/README.md) — loads this extension and draws the frame.
- [`@scylla/core-sdk`](../../sdks/core-sdk/README.md) — the contract that this extension uses.
- [`@scylla/base-sdk`](../../sdks/scylla-base-sdk/README.md) — the API of this extension for
  other extensions.
