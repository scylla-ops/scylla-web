# Architecture

> **Partly out of date.** §2 and §6 describe the current layout (a core that loads extensions).
> The other sections describe the frontend before the migration to Svelte (`refacto_svelte.md`).
> `CLAUDE.md` and the `AGENTS.md` of each package and module are the current contract. Where this
> document disagrees with them, they are correct.

This document describes the structure and architectural decisions of the Scylla frontend, a React application built on **Clean Architecture** principles with **TanStack Query** for async data management.

---

## 1. Overview

### 1.1 Core Principles

- **Separation of concerns**: Each layer has a single, clear responsibility
- **Framework independence**: Business logic does not depend on React or any UI library
- **Testability**: Layers are decoupled via interfaces
- **Dependency inversion**: Outer layers depend on inner layers through abstractions

### 1.2 Error Handling — `ScyllaResult<T>`

All async operations return `ScyllaResult<T>`, a Result type encapsulating success or failure:

```typescript
// Wrapping an async call
const result = await ScyllaResult.tryAsync(
  async () => await api.call(),
  'Error message'
);

// Pattern matching
result.fold({
  onSuccess: (data) => handleSuccess(data),
  onError: (error) => handleError(error)
});

// Or throw on error
const data = result.unwrap();
```

`ScyllaError` extends `Error` with gRPC error code extraction and network error detection.

---

## 2. Packages and modules

The frontend is a pnpm workspace. A **core** that knows no business loads **extensions**; the
extensions talk to the core, and to each other, through **SDKs**:

```
apps/web/                  @scylla/web       the build: startCore({ extensions: [ScyllaBaseExtension] })
packages/core/             @scylla/core      extension loader, route compilation, router, shell frame
packages/ui/               @scylla/ui        design system: shadcn, composites, rune helpers, stores, i18n
sdks/core-sdk/             @scylla/core-sdk  the contract: @Extension, ScyllaModule, navigation, DI, query
sdks/scylla-base-sdk/      @scylla/base-sdk  the public API of scylla-base, for other extensions
extensions/scylla-base/    @scylla/base      the Scylla product
  src/
    scylla-base.extension.ts                 @Extension({ id, name, version, modules, catalogs })
    shell/                                   modules.ts (the feature list), ShellModule (the frame)
    features/                                agents, apps, dashboard, jobs, login, marketplace, membership,
                                             organization, pipeline, project, roles, secret, triggers, user
    platform/                                authz, context, grpc
    shared/                                  ScyllaResult, status presentation
```

Dependencies point one way, and dependency-cruiser checks it: `ui` imports nobody; `core-sdk`
imports `ui`; the core imports `core-sdk` and `ui` and **never an extension**; an extension
imports `core-sdk`, `ui` and the SDKs of other extensions, **never another extension** and
never the core; only `apps/web` imports the core.

### 2.1 An extension

An extension is a class with `@Extension`. Its manifest names its modules; the modules carry
everything else:

- a **feature module** declares `domain` (the DI surface) and `routes`, with the sidebar links
  on the routes they open (`nav`);
- the module that builds the frame — scylla-base's `ShellModule` — declares the `mounts` where
  routes graft, the `navSections`, the `access` policy (`can`, `ready`, `guard`), the `shell`
  parts (header, footer, overlays, badges, breadcrumb and link parameters), `onQueryError` and
  the `fallback` page.

`loadExtensions` (core) orders the extensions by their `dependencies`, checks that ids, mounts
and sections are unique and that each link names a declared section, and merges everything into
one router config, one shell config and one DI registry.

### 2.2 Inside scylla-base

The Clean Architecture of §3 is unchanged, in four layers: `shell/` → `features/` →
`platform/` → `shared/`. Features reach each other through their `index.ts`; `@scylla/base-sdk`
re-exports those barrels for the other extensions.

---

## 3. Feature Layer Architecture

Every feature module follows the same 4-layer structure:

```
feature/
├── di/                          → Dependency wiring
│   └── feature.module.ts
├── domain/                      → Pure business logic
│   ├── usecases/
│   ├── repository/              → Repository interfaces
│   ├── entities/                → Domain entities ({Name}Entity, identity objects)
│   └── structs/                 → Plain data shapes: value objects, enums, DTOs, wrappers (no identity)
├── infrastructure/              → Technical implementations
│   ├── repository/
│   │   ├── feature.repository.ts        → Repository implementation
│   │   ├── data-sources/
│   │   │   └── feature-remote.data-source.ts   → Data source interface
│   │   └── mappers/
│   │       └── grpc-feature.mapper.ts          → Proto → Domain mapping
│   └── data/
│       └── remote/
│           └── feature-remote.data-source.impl.ts  → gRPC calls
├── locales/                     → i18n translations (en/, fr/)
└── presentation/                → UI layer
    ├── hooks/                   → React Query hooks
    ├── stores/                  → Zustand stores (UI state only)
    └── ui/                      → React components (pages, dialogs, tables)
```

### 3.1 Domain Layer

**Pure business logic, zero external dependencies.**

- **Use Cases**: Single-responsibility classes that call repository methods
- **Repository Interfaces**: Abstract contracts — no knowledge of gRPC or HTTP
- **Entities** (`domain/entities/*.entity.ts`): identity-bearing business objects, independent from proto-generated types
- **Structs** (`domain/structs/*.struct.ts`): plain data shapes with no identity — value objects, enums, DTOs, and list/result wrappers

```typescript
export class GetUsersUseCase {
  constructor(private readonly _repository: UserRepository) {}
  execute = () => this._repository.getAll();
}
```

#### Entities vs. Structs

The domain layer separates two kinds of types. Both are pure and proto-independent, but they answer different questions:

| | **Entity** (`entities/*.entity.ts`) | **Struct** (`structs/*.struct.ts`) |
|---|---|---|
| Question | "What *thing* does this feature own?" | "What *plain shapes* describe or move data?" |
| Identity | Yes — has an `id` (or a stable key) | No — interchangeable by value |
| Examples | `SecretEntity`, `RoleEntity`, `UserEntity`, `PipelineEntity` | `Permission`, `PermissionScope` (enums), `ProjectList`, `CreatedApp`, `PipelineMetadata` |
| Naming | `{Name}Entity` | plain PascalCase (no suffix) |
| One file per | aggregate / entity | cohesive group of related shapes |

An entity file is the home for everything that revolves around that entity, not just the read shape:

```typescript
// secret.entity.ts — read shape (metadata only; the value is write-only)
export interface SecretEntity {
  id: string;
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// ...plus the input shapes that belong to it
export interface CreateSecretInput {
  projectId: string;
  name: string;
  value: string; // write-only, sent once, never returned
  description: string;
}
```

Entities may also carry **pure domain behavior** (validation, transformations) — still no framework or transport imports:

```typescript
// role.entity.ts
export const updateRole = (role: RoleEntity, changes: Partial<RoleEntity>): RoleEntity => {
  if (changes.name !== undefined && changes.name.trim() === '') {
    throw new Error('Role name cannot be empty');
  }
  return { ...role, ...changes, id: role.id };
};
```

**Structs** are shared across entities and use cases — e.g. `permission.struct.ts` exports the `Permission`, `PermissionScope`, and `PrincipalKind` enums that `RoleEntity`, `GrantEntity`, and `EffectivePermissionsEntity` all reference; `project.struct.ts` exports the `ProjectList` wrapper around `ProjectEntity`. A struct file may import an entity (e.g. a `CreatedApp` result wrapping an `AppEntity`), but never the reverse direction of identity ownership.

> There are **no `*.model.ts` files** — every domain type is either an entity (`*.entity.ts` / `{Name}Entity`) or a struct (`*.struct.ts` / plain name). The `Entity` suffix is the identity signal and also disambiguates from the proto-generated type of the same bare name (aliased in mappers, e.g. `User as ProtoUser`). Presentation-layer view models follow the same rule under `presentation/structs/`.

Mappers convert proto → entity (one `Grpc{Entity}Mapper` per entity, e.g. `GrpcSecretMapper.toDomain` returns a `SecretEntity`).

### 3.2 Infrastructure Layer

**Concrete implementations of domain abstractions.**

- **Data Sources**: Interface + implementation for each transport (gRPC, localStorage, etc.)
- **Repository Impl**: Coordinates data sources, maps infrastructure types to domain types
- **Mappers**: Transform proto-generated types ↔ domain entities/structs

```typescript
export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly _remoteDataSource: UserRemoteDataSource) {}

  public async getAll(): Promise<ScyllaResult<UserList>> {
    return (await this._remoteDataSource.getAll()).map(list => GrpcUserMapper.toDomainList(list));
  }
}
```

### 3.3 Presentation Layer

**React components, hooks, and local UI state.**

- **Hooks**: Wrap use cases with TanStack Query (`useQuery` / `useMutation`)
- **Stores**: Zustand stores for ephemeral UI state (form state, modal visibility)
- **UI**: Pages, dialogs, tables, columns

```typescript
export const useCreateUser = () => {
  const { createUser } = useDependencies().user;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password }) =>
      (await createUser.execute(username, password)).unwrap(),
    onSuccess: () => {
      toast.success('User created');
      return queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
```

### 3.4 DI Layer

**Manual dependency injection, no IoC container.**

```typescript
const dataSource = new UserRemoteDataSourceImpl(CoreModule.data.grpcTransport);
const repository = new UserRepositoryImpl(dataSource);

export const UserModule = {
  domain: {
    getUsers: new GetUsersUseCase(repository),
    createUser: new CreateUserUseCase(repository),
    deleteUser: new DeleteUserUseCase(repository),
  },
};
```

All modules are aggregated in `Dependencies.ts` and provided to the React tree via `DependenciesProvider`.

---

## 4. Data Flow

### 4.1 Read Flow

```
Component → useQuery hook → UseCase.execute() → Repository (interface)
    → RepositoryImpl → RemoteDataSourceImpl → gRPC client
    → ScyllaResult<T> ← mapper ← proto response
```

### 4.2 Write Flow

```
Component → useMutation hook → UseCase.execute() → Repository
    → RemoteDataSourceImpl → gRPC client
    → onSuccess: invalidateQueries() → automatic refetch
```

### 4.3 Batch Data Loading

For N+1 query avoidance (e.g., loading jobs for all pipelines on a dashboard):

```typescript
// usePipelinesJobs.ts — uses useQueries for parallel fetching
const queries = useQueries({
  queries: pipelineIds.map(id => ({
    queryKey: JOBS_QUERY_KEY(id),
    queryFn: () => getPipelineJobs.execute(id, { page: 1, pageSize: 10 }),
  })),
});
// Returns Map<pipelineId, JobResponse[]>
```

---

## 5. Shared Patterns

### 5.1 Selection — `useSelection(key)`

Generic selection system backed by a single Zustand store (`useSelectionStore`), keyed by feature name:

```typescript
const { selectedIds, select, clearSelection } = useSelection('pipelines');
```

Used by `DataTable` (row click) and `FeatureHeader` (clear/delete actions). No per-feature store needed.

### 5.2 Feature Header — `FeatureHeader`

Standardized header component for list pages:

```tsx
<FeatureHeader
  count={totalCount}
  label='Pipeline'
  selectedCount={selectedIds.length}
  onClearSelection={clearSelection}
  onDeleteSelection={handleDelete}
  onNew={() => setOpenDialog(true)}
  newLabel={<Trans>New pipeline</Trans>}
/>
```

Provides: title with count, clear selection button, delete button with confirmation dialog, create button.

### 5.3 Form System — `ScyllaForm` + `FormDialog`

Declarative form rendering from `FormItem[]` definitions:

```typescript
const items: readonly FormItem<'name' | 'org'>[] = [
  { id: 'name', label: t`Name`, type: FormItemType.Input, inputType: 'text' },
  { id: 'org', label: t`Org`, type: FormItemType.Select, options: [...] },
];

// values: { name: string; org: string } — inferred from the ids above
<ScyllaForm items={items} onSubmit={({ name, org }) => ...} />;
```

- **`ScyllaForm`**: Standalone form with customizable footer (render prop)
- **`FormDialog`**: Wraps `ScyllaForm` inside a `Dialog` with Cancel/Submit buttons
- **`useFormState`**: Hook managing form values, change handler, reset, validation
- Both components are generic over the item ids: `onSubmit` receives `FormValues<TId>`, a
  `Record<TId, string>`. Declaring the ids (via `FormItem<'a' | 'b'>` or an `as const` array)
  is what turns a typo in a field name into a compile error; plain `FormItem[]` still works and
  degrades to `Record<string, string>`.

### 5.4 Pagination — `usePagination`

Generic pagination hook with optimistic page updates:

```typescript
const { paginationParams, paginationInfo, setPage, updatePaginationInfo } = usePagination();
```

Maintains local page/pageSize state, merges with server-returned `totalCount`/`totalPages` for immediate UI responsiveness.

---

## 6. Routing

Written in the project, in `@scylla/core` (no router library). Each module declares its routes
under a **mount**; `compileRoutes` flattens the declarations of every module of every extension
into one table of full paths, sorted by specificity. The mounts of scylla-base:

| Mount | Path | What it adds |
|-------|------|--------------|
| `public` | `/` | nothing — e.g. `/login` |
| `app` | `/` | `AppLayout` (auth gate + organization gate) and the core's shell frame |
| `organization` | `/:organizationSlug` | `OrganizationSyncWrapper` |
| `project` | `/:organizationSlug/projects/:projectId` | `ContextCleanerWrapper`, the "Project" crumb |

A page with a `permission` renders inside the `guard` of the access policy (scylla-base:
`RequirePermission`). A URL that no route matches renders the `fallback` page (scylla-base:
redirect to `/login`). The breadcrumbs come from each route's `breadcrumb`, the sidebar links
from each route's `nav`.

---

## 7. Global State

| Store | Scope | Purpose |
|-------|-------|---------|
| `useContextStore` | App-wide | Current organization & project selection |
| `useSelectionStore` | App-wide | Generic row selection keyed by feature |

All other state is managed by TanStack Query (server state) or local `useState` (component state).

---

## 8. Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI rendering |
| TypeScript 7 (`tsc`) + 6 (tool API) | Type safety |
| TanStack Query 5 | Server state, caching, mutations |
| Zustand 5 | Client state management |
| React Router 7 | Routing |
| Lingui 5 | Internationalization (en, fr) |
| gRPC-Web (protobuf-ts) | Backend communication |
| shadcn/ui + Radix | UI component primitives |
| Tailwind CSS 4 | Styling |
| Vite 7 | Build tool |
| Framer Motion | Page transitions |
