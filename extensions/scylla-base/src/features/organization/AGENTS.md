# `features/organization` — agent guide

Organizations: the top-level tenant, its members, and the switcher in the shell.

**Layer** `features/` · **id** `organization` · **DI key** `organizationRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

**Presentation is Svelte** (Phase 2 of `refacto_svelte.md`). Domain and infrastructure are
unchanged. There is no `use-<feature>-domain.ts` and no hooks: reads and writes are declared as
options objects in `presentation/organization.queries.ts`, which a component or another
feature runs with `createQuery`.

**`OrganizationList` is the one list of organizations.** The organization selector of the shell
shows it inside a dropdown menu, and gives it `DropdownMenuItem` as the `row` prop, so each row
gets the keyboard focus of the menu. Without a `row`, it shows plain rows
(`OrganizationRow.svelte`). A row component takes `class`, `onSelect` and `children`.

## Public API — `index.ts`

```typescript
type OrganizationEntity
organizationQueries        mine · members
organizationMutations      create · update · remove
invalidateOrganizationMembers
ORGANIZATIONS_QUERY_KEY, MY_ORGANIZATIONS_QUERY_KEY, ORGANIZATION_MEMBERS_QUERY_KEY
createOrganizationItems
loadOrganizationList         () => import(OrganizationList.svelte)       ← the shell's selector
loadAddOrganizationDialog    () => import(AddOrganizationDialog.svelte)  ← the shell's selector
```

The shell imports this barrel eagerly for the queries, so the components are exported as
**loaders**: a re-exported component would put its UI library in the entry chunk. Never add:
`organization.module.ts`, a component.

## Data contract

`OrganizationRepository` — `domain/repository/organization.repository.ts` (**default** export):

| Method | Returns |
|---|---|
| `getAll()` | `OrganizationEntity[]` — every org (admin view) |
| `getMine()` | `OrganizationEntity[]` — the current user's orgs |
| `listMembers(organizationId)` | `UserSummary[]` (from `user`: the RPC carries an id and a username) |

`getAll` vs `getMine` is a real distinction — the switcher must use `getMine`. Reach the
repository with `getModuleDomain` **inside `organization.queries.ts` only**.

## Layout

```
organization.module.ts               DI wiring, no route (private; registry only)
index.ts                             public API
domain/
  entities/organization.entity.ts    OrganizationEntity
  repository/organization.repository.ts
infrastructure/
  data/grpc-organization-remote.data-source.ts          impl
  repository/data-sources/organization-remote.data-source.ts   interface
  repository/mappers/grpc-organization.mapper.ts
  repository/mappers/grpc-organization-member.mapper.ts
  repository/default-organization.repository.ts
presentation/
  organization.queries.ts            every read and write, plus the key factories
  ui/OrganizationList/               the list; the shell's selector gives it its rows
  ui/AddOrganizationDialog.svelte, EditOrganizationDialog.svelte
  ui/organization.messages.ts
  utils/create-organization-form-items.ts
```

## Routes & nav

None. The organizations and roles of a user show on the pages of [`user`](../user/AGENTS.md),
from `ListUserAccess`; that module does not import this one for them.

## Rules that bite here

- `ORGANIZATION_MEMBERS_QUERY_KEY` is exported so `membership` invalidates the same entry this
  module reads. Never hand-write the key.
- The shell depends on `OrganizationList` / `AddOrganizationDialog`. Changing their props is a
  breaking change for `shell/` — update `OrganizationSelector` in the same commit.
- `AddOrganizationDialog` does not set the context: `organizationMutations.create` makes the new
  organization active, then the dialog lands on its dashboard. The description is optional
  (`optional: true` in `createOrganizationItems`), on the first-organization screen too.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
