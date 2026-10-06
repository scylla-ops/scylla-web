# `features/roles` — agent guide

Access-control administration: the role catalog, grants, and the permission vocabulary.

**Layer** `features/` · **id** `roles` · **DI keys** `permissionRepository`, `updateRole` ·
**Svelte** (Phase 4)

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type RoleEntity, RoleCreationData, GrantEntity
roleConfers
humanizeRoleId, scopeLabelOf
roleQueries, roleMutations, grantMutations
refreshMyPermissions, syncMyPermissions, resetPermissionSync
ROLES_QUERY_KEY, ORGANIZATION_ROLES_QUERY_KEY, GRANTS_QUERY_KEY, GRANTABLE_ROLES_QUERY_KEY
```

Every export is **framework-free** — options factories, pure functions, types. That is load
bearing, not incidental: `membership` and `shell` both read from here, on the same cache
entries as this module's pages.

Never add: `roles.module.ts`, a domain accessor, a page, **or any `.svelte` component** — a
component re-exported from a barrel cannot be dropped by Rollup and drags bits-ui into the chunk
of whoever imported the barrel for a type. Export a `load*()` function instead.

## ⚠ The authz split — read this first

`Permission`, `can`, `Can`, `RequirePermission` are **not** here. They live in
[`@platform/authz`](../../platform/authz/AGENTS.md), *below* the features, so that gating a
button never means depending on the module that administers roles.

The division:

| Concern | Where | Why |
|---|---|---|
| Asking "may I?" | `@platform/authz` — reads a store, no I/O | any feature may depend on it |
| Loading the answer | **here** — `syncMyPermissions` | needs a repository call |
| Administering roles/grants | **here** | it is a feature |

`syncMyPermissions(organizationId, projectId)` fetches `getMyPermissions()` and fills
`permissionsStore`, **only when the sync key — user + organization + project — changed**. The
guard is in this function, not in its caller, so it survives whichever framework mounts it. The
shell owns *when*: an effect in `shell/presentation/layout/shell.state.svelte.ts` calls it when the
active organization or project changes. Call it from **one place**,
never from a feature, and never write the authz store from anywhere else.

`resetPermissionSync()` forgets the key — for sign-out and for tests.

## Data contract

`PermissionRepository` — `domain/repository/permission.repository.ts`:

| Group | Methods |
|---|---|
| Roles | `listRoles(organizationId?)`, `getRole`, `createRole`, `updateRole`, `deleteRole` |
| Effective permissions | `getEffectivePermissions(...)`, `getMyPermissions()` |
| Grants | `listGrants(scope?, scopeId?)`, `createGrant(CreateGrantInput)`, `revokeGrant(id)`, `revokeAllAccess(RevokeAllAccessInput)` |
| Vocabulary | `listGrantableRoles(scope?, organizationId?)`, `listPermissionVocabulary()` |

Input types (`CreateGrantInput`, `RevokeAllAccessInput`) live beside the interface, in domain.

A role with no owner is a **platform role** (the builtins and the custom roles of the system
administrators). A role with an owner belongs to that **organization**: `RoleCreationData.organizationId`
creates one, `RoleOrigin.custom.ownerOrganizationId` and `GrantableRoleEntity.ownerOrganizationId`
name the owner. `RoleEntity.kind` and `RoleCreationData.kind` are a `RoleKind`: `AGENT` roles go to
apps only, `ADMIN` is for the builtin owner roles and the mapper refuses to send it, and
`UNSPECIFIED` is sent as `MEMBER`.

| Read | Query | Permission (pass it as `enabled`) |
|---|---|---|
| `listRoles()` | `roleQueries.catalog` (`ROLES_QUERY_KEY`) | `MANAGE_ROLES` |
| `listRoles(organizationId)` | `roleQueries.organizationCatalog` (`ORGANIZATION_ROLES_QUERY_KEY`) | `MANAGE_ORG_ROLES` on that organization |
| `listGrantableRoles(scope)` | `roleQueries.grantable(scope)` | none |
| `listGrantableRoles(scope, organizationId)` | `roleQueries.grantable(scope, organizationId)` | `READ_ORGANIZATION` on that organization |

`ROLES_QUERY_KEY` is also the prefix of `ORGANIZATION_ROLES_QUERY_KEY`. A role mutation
invalidates every role list and every grantable list: an organization role changes what may be
granted there.
Reach it with `getModuleDomain<typeof RolesModule.domain>('roles')` — **inside `roles.queries.ts`
only**, and resolved per call, never at module load, so a test can swap the registry.

## `UpdateRoleUseCase` — the codebase's only use case

`domain/use-cases/update-role.use-case.ts`, injected as `domain.updateRole`. It survives because
it orchestrates: **read** `getRole` → **apply** the pure `updateRole(role, changes)` entity
function → **save** `updateRole`. A repository method cannot do that. `roleMutations.update`
routes through it; `create` and `remove` call the repository, because that is all they are.

That is the bar. Anything that would just forward to a repository method is not a use case.

## Layout

```
roles.module.ts                      route + nav + DI wiring (private; registry only)
index.ts                             public API
domain/
  entities/role.entity.ts            RoleEntity, RoleCreationData, RoleOrigin,
                                     roleConfers, roleOwnerOf, updateRole (pure)
  entities/grant.entity.ts           GrantEntity
  entities/grantable-role.entity.ts  GrantableRoleEntity
  entities/permission-vocabulary.entity.ts  PermissionVocabularyEntity, PermissionActionEntity
  repository/permission.repository.ts       + CreateGrantInput, RevokeAllAccessInput
  use-cases/update-role.use-case.ts
infrastructure/
  data/grpc-permission-remote.data-source.ts             impl
  repository/data-sources/permission.data-source.ts      interface
  repository/mappers/                grpc-role, grpc-grant, grpc-grantable-role,
                                     grpc-permission, grpc-permission-vocabulary,
                                     grpc-effective-permissions
  repository/default-permission.repository.ts
presentation/
  roles.queries.ts                   every read and write, as plain options objects
  roles-page.state.svelte.ts         the master–detail ViewModel, and RolesScope
  role-form.state.svelte.ts          creating/editing one role
  grant-creator.state.svelte.ts      granting one role to one user
  role-assignees.state.svelte.ts     who holds a role (from the page's grants), and the revoke
  grant-target-labels.svelte.ts      scope id → human name (fans out for projects)
  grant-eligibility.calculator.ts    pure: who may receive a project grant, and why not
  role-authoring.calculator.ts       pure: the escalation rule, what an author may put in a role
  role-list.calculator.ts            pure: roles split by owner and sorted by name, holders per role
  ui/Roles/Roles.page.svelte         the roles of the current organization
  ui/PlatformRoles/PlatformRoles.page.svelte   the platform roles (System)
  ui/roles.messages.ts               every string the screens show
  ui/components/RolesView.svelte     the body both pages render, on a RolesScope
  ui/components/RoleList.svelte, RoleListItem/RoleListItem.svelte, RoleDetailPanel.svelte
  ui/components/role-detail/         RoleDetailHeader, RoleDetailPermissions,
                                     RoleDetailGrantList, GrantCreator, TargetChecklist
  ui/components/role-form/           RoleFormDialog, RoleForm, RoleHolderField,
                                     RoleDialogPermissions, CheckboxTree, CheckboxTreeNode,
                                     checkbox-tree.ts
  utils/permission-mapping.ts, permission-tree.ts, role-label.ts
```

There is no `presentation/hooks/`, no `use-roles-domain.ts` and no store of its own — the thirteen
hooks became `roles.queries.ts` plus the four ViewModels above.

## Routes & nav

| Mount | Path | Permission | Component | Sidebar |
|---|---|---|---|---|
| `organization` | `roles` | `MANAGE_ORG_ROLES` | `Roles.page.svelte` | section `organization`, order `35`, `ShieldIcon` |
| `organization` | `platform-roles` | `MANAGE_ROLES` | `PlatformRoles.page.svelte` | section `system`, order `20`, `ShieldCheckIcon` |

Both pages render `RolesView` on a `RolesScope`: `{ kind: 'organization', organizationId,
organizationName }` from the context, or `{ kind: 'platform' }`. Never fork a component per page:
give it the scope.

## Rules that bite here

- **Role ≠ grant.** A `RoleEntity` is a named bundle of permissions; a `GrantEntity` binds a
  principal to a role at a scope. Deleting a role and revoking a grant are different operations
  with different blast radii — keep them visually and textually distinct.
- **Every grant and role mutation already refreshes the caller's own permissions.**
  `afterGrantChange` in `roles.queries.ts` invalidates the whole grant prefix *and* calls
  `refreshMyPermissions()`; `invalidateRoles` does the same for the role lists, because an edit
  of a role the caller holds changes what the caller may do. Don't do it again at the call site,
  and don't skip it in a new grant or role mutation: `can()` would keep answering from a stale
  store and the UI would lie about what the user may do.
- **One grant mutation invalidates every grant list.** A grant created from the project view
  changes the organization's list too, and neither view knows the other exists — hence the shared
  `permission-grants` prefix rather than an exact key.
- `roleConfers` and `updateRole` are **pure entity functions**. Role logic goes in
  `role.entity.ts`, not in a component.
- **The permission tree is data.** It is built from `permission-mapping.ts`'s catalog, shaped by
  `permission-tree.ts`, and rendered by `CheckboxTree`. `checkbox-tree.ts` holds the pure rules —
  a child counts only when its whole parent chain is checked, unchecking a parent clears its
  descendants. Those rules are the permission model's, not a widget's, which is why the tree
  lives here rather than in `shared/`.
- **Implicit permissions are written, never shown.** `IMPLICIT_PERMISSIONS_BY_SCOPE` says what a
  scope confers by construction (`READ_ORGANIZATION` on an organization role) and what rides on a
  stand-in. `withImplicitPermissions` is the only thing allowed to compute the difference —
  `conferredCount` is what the editor displays, and it is the honest number.
- **A permission outside this build's catalog is carried, not deleted.** `preservedCount` in
  `role-form.state.svelte.ts` counts them; they are re-attached on save. An older build silently
  stripping a newer permission is the failure this prevents.
- **A bits-ui checkbox is a `<button>`, and `<Label for>` does not name it.** Every checkbox in
  this module carries an explicit `aria-label` — without it the control announces itself as a
  bare "checkbox" and no test can find it by name.
- `humanizeRoleId` and `permissionLabelOf` are the only sanctioned way to render a role or
  permission id to a human. Never interpolate a raw id.
- `roleQueries.grantable` is scope-aware: what you may grant on a project differs from an
  organization. The backend reads it from the roles table. Without an organization it returns
  the platform roles and needs no permission. With one, it adds the roles of that organization
  and needs `READ_ORGANIZATION` there. It is the role list that every member manager can read.
- **An organization page owns only its roles.** It lists `organizationCatalog`, split by
  `groupRolesByOwner`: the roles of the organization (editable, deletable) above the platform roles
  (read only, a lock, no edit button), each group sorted by name. A SYSTEM-scope platform role is
  left out: no grant in an organization binds it (it stays on System > Platform roles). Its counts
  and its grant list come from the organization's grants plus those of its projects
  (`scopedGrants`, one query per project); without `MANAGE_ORG_GRANTS` the counts are hidden
  (`memberCountOf` is `null`), never shown as zero. A count is of holders, not grants
  (`countHoldersByRole`): a user with the role on two projects counts once. Holders are named from
  the organization's members (with `LIST_ORGANIZATION_MEMBERS`), not from the user directory.
- **The editor locks what the author does not hold.** The backend refuses a role with a
  permission its author does not hold at System or at the owner organization
  (`ensure_no_escalation`). `role-authoring.calculator.ts` is that rule, and `lockedPermissions`
  feeds the tree: a locked row is shown, disabled, with "Not held in <org>". A stand-in also
  needs what it carries (`carriedBy`). Full control is offered only to who holds it. A locked
  permission already in an edited role stays; it is never stripped.
- **Who holds a role is fixed at creation.** `RoleHolderField` sets `RoleKind.MEMBER` (people) or
  `AGENT` (apps); an edit shows it read only. A role of an organization is organization or
  project scoped, never System. The grant dialog grants to people, so it refuses an `AGENT` role.
- **A project grant follows the backend's tenant boundary.** `grant-eligibility.calculator.ts`
  answers *why* a user cannot receive one (`not-admitted` / `cannot-see-projects`) as a value;
  which sentence explains it is the component's business.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles &&
pnpm i18n:collisions` — all clean.
New strings: add them to `presentation/ui/roles.messages.ts` (never inside a `.svelte` —
`lingui extract` does not read one), then `pnpm extract && pnpm compile`.
