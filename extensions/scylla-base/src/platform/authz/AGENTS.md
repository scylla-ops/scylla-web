# `platform/authz` — agent guide

Authorization primitives: may this user do this?

**Layer** `platform/` · alias `@platform/authz`

## Import rules — the hard one

- **MUST NEVER import a feature.** Enforced by `platform-knows-no-feature` (error). No
  exceptions, no "temporary" ones.
- May import `@shared/*` and other platform capabilities **through their `index.ts` only**
  (`platform-capability-api-only`).
- Features and `shell/` import it as `@platform/authz` — the barrel, never a deep
  path.

## Public API — `index.ts`

```typescript
Permission, permissionLevel, PERMISSION_IMPLICATIONS, impliersOf
PermissionScope, scopeCovers, type AccessScope
PrincipalKind, type Principal
accessConfers, type Access, AccessSpec
canAccess, holdsFullControl, holdsPermission
type EffectivePermissions, EffectiveScope, PermissionTarget
can, authorizationReady                            // reactive in a Svelte component
permissionsStore
Can, RequirePermission, PermissionDenied           // Svelte components
```

## The split you must not break

**Everything here is read-only and dependency-free.** `can()` answers from a store,
synchronously. It never calls the backend.

`can()` reads the stores through `toRune`, so `$derived(can(…))` in a component updates when the
permissions arrive or the active project changes. Outside a reactive context it is a plain
synchronous function. It **denies while the permissions are unknown**; read
`authorizationReady()` for a loading state.

That is precisely what lets authz sit below the features: any feature may gate its UI without
depending on the feature that administers roles.

| Concern | Where |
|---|---|
| Asking "may I?" | **here** — no I/O |
| Loading the answer | [`features/roles`](../../features/roles/AGENTS.md) — `syncMyPermissions`, called by the shell |
| Administering roles/grants | `features/roles` |

**Never add a repository, a data source or a query to this module.** The moment authz fetches,
it needs a transport and a feature's contract, and the layer inverts.

**A grant reaches a permission at its own scope or below it.** `permissionLevel` gives the
scope of the resource a permission targets, as the backend's `Permission::resource()` does (a
user counts as SYSTEM, an app as ORGANIZATION). Full control on an organization therefore does
not answer `MANAGE_ROLES` or `LIST_USERS`, and full control on a project does not answer an
organization permission. A new permission of the SYSTEM or ORGANIZATION level goes in the sets
of `permission.struct.ts`. The roles catalog takes the scope of each permission from
`permissionLevel`: there is one table, not two.

**Scopes go broad to narrow, in one function.** `scopeCovers(scope, other)` is the only place
that compares two scopes. `canAccess` and the role editor both use it. Do not compare the enum
values by hand.

**An implication is declared once.** `PERMISSION_IMPLICATIONS` (holding `MANAGE_ROLES` is
holding `MANAGE_SYSTEM_GRANTS`) is read by `accessConfers`, and the role editor writes the
implied permission from the same list.

`permissionsStore` has exactly **one writer**: `syncMyPermissions`, called by the shell state in
`shell/`. If you find yourself writing to it from anywhere else, the fix is upstream.

## Layout

```
index.ts                             public API
domain/
  structs/                           no entity: the module owns nothing with an identity
    permission.struct.ts             Permission, permissionLevel, PERMISSION_IMPLICATIONS
    permission-scope.struct.ts       PermissionScope, AccessScope, scopeCovers
    principal.struct.ts              PrincipalKind, Principal
    access.struct.ts                 AccessSpec, Access, accessConfers
    effective-permissions.struct.ts  EffectivePermissions + canAccess, holdsPermission (pure)
presentation/
  authorization.ts                   can, authorizationReady
  stores/permissions.store.ts        the store (single writer: features/roles)
  ui/Can.svelte                      conditional render (`children`, optional `fallback` snippet)
  ui/RequirePermission.svelte        route/section gate — the `guard` of the access policy (`ShellModule.access`)
  ui/PermissionDenied/               the denial state + its messages
locales/                             this capability has its own catalog
```

## Which gate to use

| Situation | Use |
|---|---|
| Show/hide a fragment | `<Can permission={…}>` or `{#if can(…)}` |
| Guard a whole route or section | `<RequirePermission>` |
| An action the user can see but not perform | `GatedButton` from `@scylla/ui`, with `allowed={can(…)}` |
| Check in a ViewModel or a query | `can(Permission.X)` |

Prefer a disabled `GatedButton` over hiding an action outright: a user who cannot tell an
action exists cannot ask for access to it.

## Rules that bite here

- **Route permissions are declared on the module, not here.** For a `ModuleRoute.permission`,
  the route guard of [`platform/routing`](../../../../../packages/core/AGENTS.md) renders `RequirePermission` for
  you. Do not wrap a page by hand as well.
- `Permission` is the enum every module gates on — adding one means adding it here, in the
  level sets of `permission.struct.ts`, and in the catalog of `features/roles` when a human may
  toggle it.
- `canAccess` in `effective-permissions.struct.ts` is **pure**. Authorization logic goes there,
  not into a component.
- Scope matters: a permission held at the organization applies to its projects; one held on a
  project does not apply upward (`scopeCovers`). `can` handles this — do not compare permission arrays by hand.
- Client-side gating is UX, not security. The backend enforces. Never treat a passing `can`
  as proof.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
