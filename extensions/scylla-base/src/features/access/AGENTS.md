# `features/access` — agent guide

The fixed roles of the server and the permissions of the caller.

**Layer** `features/` · **id** `access` · **DI keys** `accessRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## What it does

- `syncMyPermissions(workspaceId, projectId)` fills the store of `@platform/authz`: one
  `AccessService.CheckPermissions` call each for the platform, the active workspace and the
  active project. `domain/structs/permission-map.struct.ts` maps each `Permission` of the UI to
  the permission names of the server, for each kind of object. A name that the definition of a
  kind does not have is refused by the server: keep each list exact.
- One `CheckPermissions` call takes at most 50 names, and a test checks `namesFor` of each kind.
  A new `Permission` asks one name for each cell of the catalog of the server: a cell gives all
  its routes.
- `accessQueries.myScope(object)` gives what the caller can do on any object, active or not. It
  does not change the store of `@platform/authz`: give its result to `canAccess`.
- `accessQueries.list(object)` lists the roles on an object (`ListAccess`); `accessMutations`
  give and take back a role (`Grant`, `Revoke`).
- The roles are fixed (`fixed-role.struct.ts`): there is no roles editor.

Every export is framework-free: no page, no component.
