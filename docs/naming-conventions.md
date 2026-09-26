# Naming Conventions

This document gives the naming rules of the Scylla frontend: a Svelte 5 + TypeScript application
where a core loads extensions (see `architecture.md`).

`CLAUDE.md` is the contract, and the `AGENTS.md` of each package and module make it concrete.
If this document and one of them do not agree, they are correct: update this document.

---

## 1. Files and folders

### 1.1 General rule

Files and folders use **kebab-case**. Svelte component files use **PascalCase** (§1.3).

```
user-remote.data-source.ts
pagination.struct.ts
features/pipeline/
infrastructure/repository/data-sources/
```

### 1.2 File suffixes

The suffix of a file tells its role.

#### Packages and extensions

| Role | Pattern | Example |
|------|---------|---------|
| **Extension declaration** (at the extension root) | `*.extension.ts` → an `@Extension` class `{Name}Extension` | `scylla-base.extension.ts` / `ScyllaBaseExtension` |
| **Module declaration** (at the module root) | `*.module.ts` → `{Feature}Module` | `user.module.ts` / `UserModule` |
| **Module public API** | `index.ts` | `features/membership/index.ts` |

#### Domain

| Role | Pattern | Example |
|------|---------|---------|
| **Repository interface** | `*.repository.ts` → `{Entity}Repository` | `user.repository.ts` / `UserRepository` |
| **Domain entity** | `*.entity.ts` → `{Name}Entity` | `secret.entity.ts` / `SecretEntity` |
| **Struct** (value object / enum / DTO / wrapper) | `*.struct.ts`, plain name | `permission.struct.ts` / `PermissionScope` |
| **Use case** (only when it orchestrates) | `*.use-case.ts` → `{Verb}{Entity}UseCase` | `update-role.use-case.ts` / `UpdateRoleUseCase` |

#### Infrastructure

| Role | Pattern | Example |
|------|---------|---------|
| **Repository implementation** | `default-*.repository.ts` → `Default{Entity}Repository` | `default-user.repository.ts` / `DefaultUserRepository` |
| **Data source interface** | `*.data-source.ts` | `user-remote.data-source.ts` / `UserRemoteDataSource` |
| **Data source implementation** | `*.data-source.impl.ts` | `user-remote.data-source.impl.ts` / `UserRemoteDataSourceImpl` |
| **Mapper** | `grpc-*.mapper.ts` → `Grpc{Entity}Mapper` | `grpc-user.mapper.ts` / `GrpcUserMapper` |

#### Presentation

| Role | Pattern | Example |
|------|---------|---------|
| **Query / mutation options** | `<feature>.queries.ts` → `{feature}Queries`, `{feature}Mutations` | `user.queries.ts` / `userQueries` |
| **Query-key factories** (when they have their own file) | `<feature>.query-keys.ts` | `jobs.query-keys.ts` |
| **ViewModel** (runes) | `<view>.state.svelte.ts` | `roles-page.state.svelte.ts` |
| **Rune helper** (no view) | `*.svelte.ts` | `organization-sync.svelte.ts` |
| **Svelte action** | `*.actions.ts`, named by a verb | `code-mirror.actions.ts` / `renderCodeMirror` |
| **Pure algorithm** | `*.calculator.ts` | `outcomes-chart.calculator.ts` |
| **Messages** (i18n) | `*.messages.ts` → `{name}Messages` | `secret.messages.ts` / `secretMessages` |
| **Store** (framework-free, `createStore`) | `*.store.ts` → `{name}Store` | `context.store.ts` / `contextStore` |
| **Page component** | `*.page.svelte` | `UserAdmin.page.svelte` |
| **Guard / wrapper** | `*.guard.svelte` / `*.wrapper.svelte` | `Auth.guard.svelte`, `ContextCleaner.wrapper.svelte` |

#### Tests

| Role | Pattern | Example |
|------|---------|---------|
| **Test** | `*.test.ts` | `grpc-user.mapper.test.ts` |
| **French rendering test** | `*.fr.test.ts` | `MemberCard.fr.test.ts` |
| **Test fixture** (a component that a test renders) | `*.fixture.svelte` | `DataTable.fixture.svelte` |

There are **no** `*.model.ts` files, **no** `use-*.ts` hooks and **no** `*.router.tsx` files.

### 1.3 Svelte component files

Component files use **PascalCase**:

```
FeatureHeader.svelte
FormDialog.svelte
ScyllaForm.svelte
DataTable.svelte
```

A component with a test has its own folder, with the same name: `LoginForm/LoginForm.svelte`,
`LoginForm/LoginForm.test.ts`, `LoginForm/LoginForm.fixture.svelte`. A page drops `.page` from
the folder name: `Login/Login.page.svelte`.

A test that does not test one component goes in the `__test__/` folder of the directory that it
covers: `presentation/grant-creator.state.svelte.ts` →
`presentation/__test__/grant-creator.state.svelte.test.ts`.

### 1.4 Packages

| Folder | Package name |
|--------|--------------|
| `packages/<name>` | `@scylla/<name>` (`@scylla/core`, `@scylla/ui`) |
| `sdks/core-sdk` | `@scylla/core-sdk` |
| `sdks/<name>-sdk` | the SDK of an extension (`sdks/scylla-base-sdk` → `@scylla/base-sdk`) |
| `extensions/<name>` | `@scylla/<name>` (`extensions/scylla-base` → `@scylla/base`) |

---

## 2. TypeScript naming

### 2.1 Interfaces and types

**PascalCase**, no `I` prefix.

- Use **`interface`** for object shapes that are extended or implemented: component props,
  repository contracts, data source contracts.
- Use **`type`** for what an interface cannot express: unions, literal unions, mapped and utility
  types, function types, aliases.
- Type-only imports use `import type`.

```typescript
interface UserRepository { ... }
interface PaginationInfo { ... }
type OutcomeRange = '7d' | '14d' | '30d';
type FormValues<TId extends string> = Record<TId, string>;
```

### 2.2 Domain entities and structs

The domain layer has two kinds of types (see `architecture.md` §5.1): **entities** are the
identity-bearing objects that a feature owns; **structs** are data shapes with no identity.

| Kind | File | Type name | Example |
|------|------|-----------|---------|
| Entity | `{name}.entity.ts` | `{Name}Entity` | `SecretEntity`, `UserEntity` |
| Entity input shape | the same entity file | `Create{Name}Input` / `{Name}CreationData` | `CreateSecretInput`, `RoleCreationData` |
| Entity behavior (pure function) | the same entity file | camelCase verb | `updateRole(role, changes)` |
| Struct | `{name}.struct.ts` | plain PascalCase, no suffix | `Permission`, `PermissionScope`, `ProjectList`, `CreatedApp` |

```typescript
// secret.entity.ts
export interface SecretEntity { id: string; projectId: string; name: string; /* ... */ }
export interface CreateSecretInput { projectId: string; name: string; value: string; /* ... */ }

// permission.struct.ts
export enum PermissionScope { UNSPECIFIED = 0, SYSTEM = 1, ORGANIZATION = 2, PROJECT = 3 }
```

The `Entity` suffix also makes the domain type different from the proto type with the same
bare name (e.g. domain `UserEntity`, proto `User`). A mapper can alias the proto type when the
two names clash.

### 2.3 Classes

**PascalCase**, with a suffix for the role:

| Role | Pattern | Example |
|------|---------|---------|
| Extension | `{Name}Extension` | `ScyllaBaseExtension` |
| Use case | `{Verb}{Entity}UseCase` | `UpdateRoleUseCase` |
| Repository implementation | `Default{Entity}Repository` | `DefaultUserRepository` |
| Data source implementation | `{Entity}RemoteDataSourceImpl` | `UserRemoteDataSourceImpl` |
| Mapper | `Grpc{Entity}Mapper` | `GrpcUserMapper` |
| ViewModel class | `{View}State` | `LoginState` |
| Error / result | `ScyllaError`, `ScyllaResult<T>` | — |

### 2.4 Enums

**PascalCase** for the name. **UPPER_SNAKE_CASE** or **PascalCase** for the values:

```typescript
enum FormItemType {
  Input = 'input',
  Select = 'select',
}

enum PermissionScope {
  UNSPECIFIED = 0,
  SYSTEM = 1,
}
```

### 2.5 Constants and query keys

**UPPER_SNAKE_CASE** for true constants and for query-key factories. **camelCase** for derived
values:

```typescript
const DEFAULT_PAGE_SIZE = 10;
const MAX_JOBS_PER_PIPELINE = 10;

export const USERS_QUERY_KEY = () => ['users'] as const;
export const JOBS_QUERY_KEY = (pipelineId: string) => ['jobs', 'pipeline', pipelineId] as const;
```

Always use a factory, so the queries and the invalidations stay in sync:

```typescript
getQueryClient().invalidateQueries({ queryKey: JOBS_QUERY_KEY(pipelineId), exact: true });
```

---

## 3. Svelte naming

### 3.1 Components

**PascalCase**, named by what they render: `FeatureHeader`, `PipelineTable`, `FormDialog`.

### 3.2 Props

The props type is named `Props`, inside the component:

```svelte
<script lang="ts">
  interface Props {
    count: number;
    label: string;
    onNew?: () => void;
  }

  let { count, label, onNew }: Props = $props();
</script>
```

A callback prop starts with `on` (`onNew`, `onSubmit`, `onClearSelection`).

### 3.3 Rune state factories and ViewModels

There are **no `use*` hooks**. A factory of rune state is **camelCase `create*`**:

| Kind | Pattern | Example |
|------|---------|---------|
| ViewModel of a view | `create{View}` in `<view>.state.svelte.ts`, or a `{View}State` class | `createRolesPage()`, `createPipelineDashboard(projectId)`, `LoginState` |
| Shared rune helper | `create{Concept}` | `createSelection(key)`, `createPagination(options)`, `createFormState(() => items)` |
| TanStack Query | `createQuery`, `createMutation`, `createQueries` (from `@scylla/core-sdk`) | `createQuery(() => userQueries.byId(id))` |

A ViewModel is named after the view that it controls, never after a global concept.

### 3.4 Stores

A store is framework-free, made with `createStore`, and named **`{name}Store`**:
`contextStore`, `selectionStore`, `permissionsStore`. Rune code reads it with
`toRune(store)`.

### 3.5 Svelte actions

A Svelte action is named by a **verb**: `renderCodeMirror`. It lives in `*.actions.ts`.

---

## 4. Module naming

### 4.1 Module declaration

Each module exports `{Feature}Module` from `<feature>.module.ts`, with a kebab-case `id` and a
`domain` object. The keys of `domain` are the camelCase names of the repositories:

```typescript
export const UserModule = {
  id: 'user',
  domain: { userRepository: repository },
  routes: { organization: [ /* ... */ ] },
} satisfies ScyllaModule;
```

A `*.queries.ts` reads it with the same id:

```typescript
const repository = () => getModuleDomain<typeof UserModule.domain>('user').userRepository;
```

Module ids are unique across all the extensions.

### 4.2 Query and mutation options

`<feature>.queries.ts` exports `{feature}Queries` and `{feature}Mutations`. Each entry is a
factory, named by what it reads or does:

```typescript
userQueries.list();
userQueries.byId(userId);
jobQueries.byPipeline(pipelineId, pagination);
userMutations.create();
userMutations.update();
userMutations.remove();
```

### 4.3 Loaders

A barrel never exports a Svelte component. It exports a loader, named `load{Component}`:

```typescript
export const loadJobsPage = () => import('./presentation/ui/Jobs.page.svelte');
```

---

## 5. i18n

- Catalogs live in `locales/{en,fr}/messages.po`, per module.
- Declare each message with `` msg`…` `` in a `*.messages.ts` beside its component, in an object
  named `{name}Messages`. Render it with `t()` from `@scylla/ui/i18n`.
- A message with a placeholder is a function: `` newEntity: (label: string) => msg`New ${label}` ``.
- Keep the placeholder names when you move a message: they are part of the msgid.

---

## 6. Summary

| Concept | Casing | Example |
|---------|--------|---------|
| File (not a component) | kebab-case | `default-user.repository.ts` |
| File (Svelte component) | PascalCase | `FeatureHeader.svelte` |
| Folder | kebab-case | `data-sources/` |
| Interface / type | PascalCase | `UserRepository` |
| Component props | `Props`, inside the component | `interface Props` |
| Domain entity | PascalCase + `Entity` (`*.entity.ts`) | `SecretEntity` |
| Struct | PascalCase, no suffix (`*.struct.ts`) | `PermissionScope` |
| Class | PascalCase + role suffix | `DefaultUserRepository` |
| Extension | PascalCase + `Extension` | `ScyllaBaseExtension` |
| Module declaration | PascalCase + `Module` | `UserModule` |
| Rune state factory | camelCase `create*` | `createPagination` |
| Store | camelCase + `Store` | `contextStore` |
| Queries / mutations | camelCase + `Queries` / `Mutations` | `userQueries` |
| Messages | camelCase + `Messages` | `secretMessages` |
| Svelte action | camelCase verb | `renderCodeMirror` |
| Loader | camelCase `load*` | `loadJobsPage` |
| Constant | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| Query-key factory | UPPER_SNAKE_CASE | `JOBS_QUERY_KEY` |
| Enum | PascalCase | `FormItemType` |
