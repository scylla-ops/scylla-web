# Architecture

This document describes the structure of the Scylla frontend and the reasons for it. The Scylla
frontend is a Svelte 5 + TypeScript single-page application. A **core** loads **extensions**.
Each extension is built on **Clean Architecture**, with **TanStack Query** for async data.

`CLAUDE.md` is the contract, and the `AGENTS.md` of each package and module make it concrete.
If this document and one of them do not agree, they are correct: update this document.

---

## 1. Overview

### 1.1 Core principles

- **The core knows no business.** It loads extensions, compiles their routes, runs the router and
  renders the shell frame. It does not know organizations, permissions or the backend.
- **Everything is declared by modules.** Routes, sidebar links, DI, the shell parts and the
  access policy come from the modules of the extensions. There is no second list to keep in sync.
- **Dependencies point one way**, between packages and between the layers of a module. The
  rules are machine-checked (`pnpm depcruise`, `pnpm depcruise:cycles`).
- **Framework independence**: the domain layer does not import Svelte, gRPC or proto code.
- **Server state lives in TanStack Query**, never in a store.

### 1.2 Error handling — `ScyllaResult<T>`

All async operations return `ScyllaResult<T>`, a Result type that holds a success or a failure:

```typescript
const result = await ScyllaResult.tryAsync(async () => api.call(), 'Error message');

result.fold({
  onSuccess: data => handleSuccess(data),
  onError: error => handleError(error),
});

const data = result.unwrap(); // throws on error
```

`ScyllaError` extends `Error`. It extracts the gRPC status code (`getCode`, `isNotFound`,
`isForbidden`, `isNetworkError`, …) and gives a message for the user (`userMessage`). Both live
in scylla-base `shared/utils/scylla-result.ts`. Other extensions get them from `@scylla/base-sdk`.

In query and mutation options, call `.unwrap()` inside `queryFn` / `mutationFn`, so TanStack Query
handles the error.

---

## 2. Packages

The frontend is a pnpm workspace:

```
apps/web/                  @scylla/web       the build: the list of extensions, main.ts
packages/core/             @scylla/core      extension loader, route compilation, router, shell frame
packages/ui/               @scylla/ui        design system: shadcn, composites, rune helpers, stores, i18n
sdks/core-sdk/             @scylla/core-sdk  the contract: @Extension, ScyllaModule, navigation, DI, query
sdks/scylla-base-sdk/      @scylla/base-sdk  the public API of scylla-base, for the other extensions
extensions/scylla-base/    @scylla/base      the Scylla product
```

### 2.1 Dependency direction

```
apps/web                 may import the core, the extension roots and the SDKs
  ↓
packages/core            imports core-sdk and ui — NEVER an extension or an extension SDK
extensions/<name>        imports core-sdk, ui and the SDKs of other extensions
                         — NEVER another extension, NEVER the core
  ↓
sdks/<name>-sdk          re-exports the barrels of one extension
sdks/core-sdk            imports ui only
  ↓
packages/ui              imports no other package
```

A package is reached only through the entry points of its `package.json` `exports`, never
through a deep path. `.dependency-cruiser.cjs` enforces this with the rules `ui-is-generic`,
`core-sdk-is-the-contract`, `core-knows-no-extension`, `extension-uses-sdks`, `sdk-is-the-door`
and `package-api-only`.

### 2.2 Start-up

`apps/web/src/main.ts` calls `startCore({ extensions, target })`. The list of extensions is in
`apps/web/src/extensions.ts`:

```typescript
export const extensions: readonly ExtensionClass[] = [ScyllaBaseExtension];
```

`startCore` (in `@scylla/core`) then:

1. calls `loadExtensions` to read and merge the extensions (§3.2);
2. registers the i18n catalogs of the core and of each extension;
3. installs the DI registry (`setDependencyRegistry`), the query client (`setQueryClient`, with
   the `onQueryError` handlers of the modules) and the shell config;
4. initializes the locale before the first render, so no frame shows untranslated text;
5. installs the router as the app navigator (`setAppNavigator`) and mounts `App.svelte`.

`@scylla/core-sdk` holds the API (`navigateTo`, `getModuleDomain`, `createQuery`, …), and the core
installs its implementation. Thus an extension uses the router, the DI and the query client
without an import of the core.

---

## 3. Extensions

### 3.1 An extension is a class with `@Extension`

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

The manifest is `{ id, name, version, dependencies?, modules, catalogs? }`. The manifest names
the modules, and the modules carry everything else.

### 3.2 The loader

`loadExtensions` (`packages/core/src/loader/load-extensions.ts`) reads the `@Extension` of each
class and:

- orders the extensions by their `dependencies` (a dependency loads first; a cycle or a missing
  dependency is an error);
- makes sure that the ids of extensions, modules, mounts and nav sections are unique;
- makes sure that at most one module gives the `access` policy, and exactly one gives the
  `fallback` page;
- makes sure that each sidebar link names a declared nav section;
- merges everything into one router config, one shell config, one DI registry (module id →
  `domain`), the list of catalogs and the list of query error handlers.

A declaration that cannot work fails at start-up and in the tests, not on the page.

### 3.3 The `ScyllaModule` contract

Each module declares itself in `<feature>.module.ts`:

```typescript
const dataSource = new UserRemoteDataSourceImpl(grpcTransport);
const repository = new DefaultUserRepository(dataSource);

export const UserModule = {
  id: 'user',
  domain: { userRepository: repository },          // the DI surface
  routes: {
    organization: [                                // the mount where the route grafts
      {
        path: 'users',
        permission: Permission.LIST_USERS,         // the route guard AND the sidebar link
        breadcrumb: () => ({ label: msg`Users` }),
        page: () => import('./presentation/ui/admin/UserAdmin.page.svelte'),
        nav: { section: 'system', title: msg`Users`, icon: UsersIcon, order: 10 },
      },
    ],
  },
} satisfies ScyllaModule;
```

- `page` is a dynamic import. This keeps the pages out of the initial chunk.
- `permission` guards that page only. A child route (`children`) declares its own.
- `nav` makes a sidebar link. The link takes the URL and the permission of its route.
- Labels are `` msg`…` `` descriptors, so the module file stays a `.ts` file.
- Route parameters arrive as props of the page.

The **frame** is also declared by modules, with optional fields: `mounts`, `navSections`,
`access` (`can`, `ready`, `guard`), `shell` (sidebar footer, overlays, nav badge, breadcrumb and
link parameters), `onQueryError` and `fallback`. In scylla-base, `ShellModule` declares all of
them.

A route's `permission` has the type that one extension registers on `Register` (scylla-base
registers `Permission` in `@platform/authz`). Until an extension registers a type, no route can
declare a permission. The core only gives the permission to the access policy.

### 3.4 SDKs: how an extension uses another one

An extension never imports another extension. It imports its SDK. `@scylla/base-sdk` re-exports
the barrels of scylla-base (`platform/authz`, `platform/context`, `platform/grpc`,
`ScyllaResult` and each feature). scylla-base itself never imports its SDK.

If an extension needs something that the SDK does not export, export it from the `index.ts` of
the owner module.

---

## 4. Inside scylla-base

```
extensions/scylla-base/src/
  scylla-base.extension.ts     the @Extension class
  shell/                       modules.ts (the feature list), ShellModule (the frame)
  features/                    agents, apps, dashboard, jobs, login, marketplace, membership,
                               organization, pipeline, project, roles, secret, triggers, user
  platform/                    authz, context, grpc
  shared/                      shared code with a business meaning (ScyllaResult, status presentation)
```

### 4.1 Four layers, dependencies point down

```
shell/        imports features through their index.ts, and features/<x>/<x>.module.ts in modules.ts
  ↓
features/     import platform + shared — never the shell, never the internals of another feature
  ↓
platform/     cross-cutting capabilities with a domain — NEVER a feature
  ↓
shared/       shared code with a business meaning — no feature imports
```

Generic UI without a business meaning goes to `@scylla/ui`, not to `shared/`. The aliases
`@base/*`, `@platform/*` and `@shared/*` are for scylla-base only. The module graph has no cycle.

### 4.2 The `index.ts` is the public API

Other modules import a module only through its `index.ts`. The rest of the module is private.
A barrel must not export:

- the `<feature>.module.ts`. It creates the data sources at import time, so a re-export pulls the
  gRPC client into the chunk of each consumer. Only `shell/modules.ts` imports it, by path.
- a Svelte component. Rollup cannot remove a component that a barrel re-exports. Export a loader
  (`export const loadJobsPage = () => import('./…/Jobs.page.svelte')`).

### 4.3 The mounts

`ShellModule` declares the mounts where the routes of the features graft:

| Mount | Path | What it adds |
|-------|------|--------------|
| `public` | `/` | nothing — e.g. `/login` |
| `app` | `/` | `AppLayout` (auth gate + organization gate) and the core's shell frame |
| `organization` | `/:organizationSlug` | `OrganizationSyncWrapper` |
| `project` | `/:organizationSlug/projects/:projectId` | `ContextCleanerWrapper`, the "Project" crumb |

It also declares the nav sections (`organization`, `system`), the access policy (`can`,
`authorizationReady`, `RequirePermission`), the shell parts, the query error handler and the
fallback page (a redirect to `/login`).

---

## 5. Feature layer architecture

Each feature module has the same structure. Inside a feature, dependencies point inward:
`presentation → domain ← infrastructure`.

```
feature/
├── feature.module.ts    → the module declaration { id, domain, routes? } — private
├── index.ts             → the public API
├── AGENTS.md, README.md
├── domain/              → pure business logic: no Svelte, no gRPC, no proto
│   ├── repository/      → repository interfaces + their input types (the data contract)
│   ├── entities/        → {Name}Entity — identity-bearing objects (*.entity.ts)
│   ├── structs/         → value objects, enums, DTOs, wrappers (*.struct.ts)
│   └── use-cases/       → optional — only when a use case orchestrates (§5.1)
├── infrastructure/
│   ├── repository/
│   │   ├── default-feature.repository.ts   → repository implementation
│   │   ├── data-sources/                    → data source interface
│   │   └── mappers/                         → proto ↔ domain (Grpc{Entity}Mapper)
│   └── data/remote/                         → gRPC calls (*.data-source.impl.ts)
├── locales/             → i18n catalogs (en/, fr/)
└── presentation/
    ├── <feature>.queries.ts        → query-key factories, queryOptions / mutationOptions
    ├── <view>.state.svelte.ts      → ViewModels (runes), when a view needs one
    ├── *.actions.ts / *.calculator.ts → Svelte actions / pure algorithms
    └── ui/                         → Svelte components + *.messages.ts
```

### 5.1 Domain layer

**Pure business logic, zero external dependencies.**

- **Repository interfaces** are the data contract of the module. Presentation calls them
  directly. They know nothing about gRPC or HTTP, and their input types live beside them.
- **Entities** (`entities/*.entity.ts`, `{Name}Entity`) are the identity-bearing objects that the
  feature owns. They can hold the related input shapes and pure behavior.
- **Structs** (`structs/*.struct.ts`, plain PascalCase) are data shapes with no identity.
- **Use cases are optional.** A use case is necessary only when it does something that a
  repository method cannot do: orchestrate several calls, apply a business rule, or combine
  repositories. A class that only forwards to `repository.method(args)` is deleted. Today, one
  use case exists: `UpdateRoleUseCase` (read → apply a pure entity function → save).

#### Entities vs. structs

| | **Entity** (`entities/*.entity.ts`) | **Struct** (`structs/*.struct.ts`) |
|---|---|---|
| Question | "What *thing* does this feature own?" | "What *plain shapes* describe or move data?" |
| Identity | Yes — has an `id` (or a stable key) | No — interchangeable by value |
| Examples | `SecretEntity`, `RoleEntity`, `UserEntity`, `PipelineEntity` | `Permission`, `PermissionScope`, `ProjectList`, `CreatedApp` |
| Naming | `{Name}Entity` | plain PascalCase (no suffix) |
| One file per | aggregate / entity | cohesive group of related shapes |

```typescript
// secret.entity.ts — the read shape (metadata only; the value is write-only)
export interface SecretEntity {
  id: string;
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// ...and the input shapes that belong to it
export interface CreateSecretInput {
  projectId: string;
  name: string;
  value: string; // write-only, sent once, never returned
  description: string;
}
```

```typescript
// role.entity.ts — pure domain behavior
export const updateRole = (role: RoleEntity, changes: Partial<RoleEntity>): RoleEntity => {
  if (changes.name !== undefined && changes.name.trim() === '') {
    throw new Error('Role name cannot be empty');
  }
  return { ...role, ...changes, id: role.id };
};
```

There are **no `*.model.ts` files**. The `Entity` suffix also makes the domain type different
from the proto type with the same bare name (aliased in mappers, e.g. `User as ProtoUser`).

### 5.2 Infrastructure layer

- **Data sources**: an interface + an implementation (`*.impl.ts`) for each transport.
- **Repository implementation** (`Default{Entity}Repository`): coordinates the data sources and
  maps infrastructure types to domain types.
- **Mappers** (`Grpc{Entity}Mapper`): proto ↔ domain.

```typescript
export class DefaultUserRepository implements UserRepository {
  constructor(private readonly _remoteDataSource: UserRemoteDataSource) {}

  public async getAll(): Promise<ScyllaResult<PaginatedList<UserEntity>>> {
    return (await this._remoteDataSource.getAll()).map(list => GrpcUserMapper.toDomainList(list));
  }
}
```

The gRPC transport is `grpcTransport` from `@platform/grpc` (gRPC-Web, protobuf-ts).

### 5.3 Presentation layer

- **`*.queries.ts`** wraps the repository (or a use case) in `queryOptions` / `mutationOptions`.
  It is plain TypeScript. It gets its repository with `getModuleDomain`.
- **Components and ViewModels** run the options with `createQuery` / `createMutation` from
  `@scylla/core-sdk` — never from `@tanstack/svelte-query`.
- **A component never calls the domain directly.** Only a `*.queries.ts` or a
  `*.state.svelte.ts` calls `getModuleDomain`.

```typescript
const repository = () => getModuleDomain<typeof UserModule.domain>('user').userRepository;

export const USERS_QUERY_KEY = () => ['users'] as const;

export const userMutations = {
  create: () =>
    mutationOptions({
      mutationFn: async ({ username, password }: { username: string; password: string }) =>
        (await repository().create(username, password)).unwrap(),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.USER_CREATE));
        return getQueryClient().invalidateQueries({ queryKey: USERS_QUERY_KEY() });
      },
    }),
};
```

```svelte
<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { userMutations } from '../user.queries.ts';

  const createUser = createMutation(() => userMutations.create());
</script>
```

Where the logic goes:

| Need | Solution | Where |
|------|----------|-------|
| Simple UI state (a toggle, a dialog, tabs) | `$state` | the `<script>` of the `.svelte` file |
| Page orchestration (queries + filters + pagination) | a ViewModel | `presentation/<view>.state.svelte.ts` |
| Complex UI logic without network | a UI-only ViewModel | `presentation/<view>.state.svelte.ts` |
| A pure algorithm | a pure function | `presentation/*.calculator.ts` |
| DOM measurement, native events, a third-party widget | a Svelte action | `presentation/*.actions.ts` |

`$effect` is a last resort: use it only to synchronize with a system outside Svelte.

### 5.4 Dependency injection

There is no IoC container. The `<feature>.module.ts` creates the data sources and the
repository, and exposes them in `domain`. `loadExtensions` builds the registry (module id →
`domain`) from all the modules of all the extensions, and `startCore` installs it with
`setDependencyRegistry`. The `*.queries.ts` of the feature reads it:

```typescript
getModuleDomain<typeof UserModule.domain>('user').userRepository;
```

The repository is read at each call, so a test can replace the registry (`withRegistry`).

---

## 6. Data flow

### 6.1 Read flow

```
Component / ViewModel → createQuery(() => xQueries.y()) → queryFn
    → Repository (interface) → Default{Entity}Repository → RemoteDataSourceImpl → gRPC client
    → ScyllaResult<T> ← mapper ← proto response
    → .unwrap() → TanStack Query cache
```

### 6.2 Write flow

```
Component → createMutation(() => xMutations.y()) → mutationFn → Repository
    → RemoteDataSourceImpl → gRPC client
    → onSuccess: getQueryClient().invalidateQueries({ queryKey: X_QUERY_KEY(...) }) → refetch
```

### 6.3 Query keys

Always use **factory functions**, so the queries and the invalidations stay in sync:

```typescript
export const JOBS_QUERY_KEY = (pipelineId: string) => ['jobs', 'pipeline', pipelineId] as const;
```

### 6.4 Batch loads

To prevent N+1 queries, use `createQueries`. For example, the pipeline dashboard loads the recent
jobs of each pipeline on the page:

```typescript
const fanOut = $derived(jobsByPipelinesQueries(pipelineIds));
const jobResults = createQueries(() => ({ queries: fanOut.queries }));
const jobs = $derived(fanOut.combine([...jobResults]));
```

A query that another feature imports through the barrel runs outside the route guard of its
owner. Thus it checks the permission itself: `jobsByPipelinesQueries` sets
`enabled: authorizationReady() && can(Permission.LIST_JOBS_BY_PIPELINE)`.

---

## 7. Routing

The router is written in the project, in `@scylla/core` (no router library). The declaration
types are in `@scylla/core-sdk`.

- **Compilation** (`routing/compilation/`): `compileRoutes` flattens the routes of all the modules
  of all the extensions, under their mounts, into one table of full paths sorted by specificity.
  `navEntriesFor` makes the sidebar links from the `nav` of the routes.
- **Runtime** (`routing/runtime/`): `createAppRouter` matches the location, resolves redirects,
  and gives the navigator that `navigateTo`, `routeParams` and `routeTrail` use.
- **View** (`routing/view/`): renders the layout, the wrappers, the shell frame and the page.

A page with a `permission` renders inside the `guard` of the access policy (scylla-base:
`RequirePermission`). A URL that no route matches renders the `fallback` page. The breadcrumbs
come from the `breadcrumb` of each route and mount.

Inside scylla-base, navigate with `scyllaNavigate` or `navigateTo` from `@platform/context`.
Another extension uses `navigateTo` from `@scylla/core-sdk`. Never import the router.

---

## 8. Shared patterns

These are in `@scylla/ui` (entry points `@scylla/ui`, `@scylla/ui/shadcn`, `@scylla/ui/state`,
`@scylla/ui/stores`, `@scylla/ui/i18n`, `@scylla/ui/utils`, `@scylla/ui/structs`).

### 8.1 Selection — `createSelection(key)`

A generic selection over one `selectionStore`, keyed by feature:

```typescript
const selection = createSelection('pipelines');
selection.selectedIds;
```

`DataTable` (row click) and `FeatureHeader` (clear / delete actions) use it. There is no
selection store per feature.

### 8.2 List header — `FeatureHeader`

The standard header of a list page: the title with the count, a button to clear the selection,
a delete button with a confirmation dialog, and a create button.

### 8.3 Forms — `ScyllaForm`, `FormDialog`, `createFormState`

A declarative form from `FormItem[]` definitions:

```typescript
const items: readonly FormItem<'name' | 'org'>[] = [
  { id: 'name', label: t(messages.name), type: FormItemType.Input, inputType: 'text' },
  { id: 'org', label: t(messages.org), type: FormItemType.Select, options: [...] },
];
```

- **`ScyllaForm`**: a standalone form.
- **`FormDialog`**: `ScyllaForm` inside a `ScyllaDialog`, with Cancel / Submit buttons.
- **`createFormState(() => items)`**: values, change handler, reset, validation.
- Both components are generic over the item ids: `onSubmit` receives `FormValues<TId>`. Thus a
  typo in a field name is a compile error.

### 8.4 Modals — `ScyllaDialog`

Use `ScyllaDialog` for each modal, never `Dialog` + `DialogContent` directly. It rebuilds its
content at each opening, so a form resets without an effect.

### 8.5 Pagination — `createPagination(options)`

Local page state, merged with the `totalCount` / `totalPages` of the server. With
`responsive: true`, the page size comes from the measured height of the container (`measure`
action), and `isPageSizeReady` is false until the measure is done.

---

## 9. Global state

| Store | Package | Purpose |
|-------|---------|---------|
| `contextStore` | scylla-base `@platform/context` | Current organization, project and pipeline |
| `permissionsStore` | scylla-base `@platform/authz` | Effective permissions of the user |
| `selectionStore` | `@scylla/ui/stores` | Generic row selection, keyed by feature |

The stores are framework-free (`createStore`). Rune code reads a store with `toRune(store)`.
All other state is in TanStack Query (server state) or in local `$state` (component state).
Do not copy query data into a store or into `$state`.

---

## 10. i18n

Lingui 5. `lingui extract` does not read `.svelte` files: declare each message with `` msg`…` ``
in a `*.messages.ts` beside its component, and render it with `t()` from `@scylla/ui/i18n`.
Catalogs are per module (`locales/{en,fr}/messages.po`). Each package registers its catalogs:
`@scylla/ui` and the core their own, each extension through `@Extension({ catalogs })`. The
runtime merges them into one map, so `pnpm i18n:collisions` must stay at zero.

---

## 11. Tech stack

| Technology | Purpose |
|------------|---------|
| Svelte 5 (runes) | UI rendering — a static SPA, no SvelteKit |
| TypeScript 7 (`tsc`) + 6 (tool API) | Type safety |
| TanStack Query 5 (`@tanstack/svelte-query`) | Server state, caching, mutations |
| TanStack Table 9 | Data tables |
| Router written in `@scylla/core` | Routing |
| Lingui 5 | Internationalization (en, fr) |
| gRPC-Web (protobuf-ts) | Backend communication |
| shadcn-svelte + bits-ui | UI component primitives |
| lucide (`@lucide/svelte`) | Icons |
| svelte-sonner | Toasts |
| `@xyflow/svelte` | Graphs |
| CodeMirror 6 | Code editor |
| Tailwind CSS 4 | Styling |
| Vite 7 | Build tool |
| Vitest + Testing Library | Tests |
| dependency-cruiser | Architecture rules |
