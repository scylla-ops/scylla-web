# `features/roles` — agent guide

The catalog of the permissions, the built-in roles, and the custom roles.

**Layer** `features/` · **id** `roles` · **DI keys** `roleRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## What it does

- `Instance › Roles`: the list, a new role, a custom role in the editor, a built-in role in read-only mode.
- `<workspace> › Access › Roles`: the custom roles of the workspace, the roles from the instance, a new role and the editor. A reader with no `create_role` sees a text that says who can give the access.
- A save and a delete use `mutateAsync`: the list reloads first and can unmount the page, and a callback of `mutate` then does not run.
- A delete of a role with holders moves them first (`DeleteRole` with `move_to`). A save of a role with holders shows the change first.
- `ListHeldPermissions` locks a cell of the editor and a role in a select. The server checks again.
- `changeInstanceRoles`: `Grant` and `Revoke` on the platform, for the dialog of the users page.

## Rules

- The server owns the catalog. `ListPermissionCatalog` gives the areas, the actions and `depends_on`. Do not write a list of permissions here. A label comes from `areaLabels`, and an unknown area shows its id.
- The holders and the owner of a role do not change after the creation. The level changes only while the role has no holder, and the server checks it again (`ROLE_IN_USE`). A change of the level fits the permissions to the new level.
- `PermissionTable` with no `onChange` is the read-only table.
- A built-in role does not change, so it never opens in the editor.
- New strings go in `messages/roles.messages.ts`.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
New strings: `pnpm extract && pnpm compile`.
