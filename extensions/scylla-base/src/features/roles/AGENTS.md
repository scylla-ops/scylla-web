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
- The two lists share `RoleRow` and `RolesTableHeader`. A row shows the level tile (`LevelTile`, colours and icons in `presenters/role-level.presenter.ts`), the type, and `RolePermissions`: one chip per resource on one line, and a "+N" pill with a hover card for the chips that do not fit. `presenters/role-permissions.presenter.ts` makes the chips. A click on the Role header sorts each section by name: A → Z, Z → A, then the order of the server. The sort is component state.
- The Holders column (`HolderStack`) shows the first three actors of a role as a stack of `IdentityAvatar` (24 px), a "+N" pill, and the count. `presenters/holder-stack.presenter.ts` shows an actor once, also when it holds the role on several projects. Each row with holders reads `ListRoleHolders` (the same query as the card "About this role"), only when `canSeeRoleHolders(workspaceId)` is true: else the row shows the count only.
- The editor (`RoleEditor`) keeps the level, the holder, the permissions and the last copy in `role-draft.state.svelte.ts`. `LevelChoice` shows the levels as cards with the level tile. `CopyFromRole` is the "Copy from a role" menu: the empty role, then the roles that `presenters/role-copy.presenter.ts` gives, grouped by level. A copy takes the level, the holder and the permissions of the source. "Undo" puts back the draft from before the last copy.
- `components/PermissionTable/` shows one tab for each level that the role covers (`levelTabs` in `presenters/permission-table.presenter.ts`). Thus a workspace role has no Instance tab. Only the active tab has a table. The box in the header selects or clears the whole tab, the box of a row selects or clears the row, and an action header selects or clears its column. A box is mixed (`aria-checked="mixed"`) when only a part is selected. These boxes count only the cells that the user can change: a cell that is always on or locked does not change.
- A save and a delete use `mutateAsync`: the list reloads first and can unmount the page, and a callback of `mutate` then does not run.
- A delete of a role with holders moves them first (`DeleteRole` with `move_to`). A save of a role with holders shows the change first.
- `ListHeldPermissions` locks a cell of the editor and a role in a select. The server checks again.
- The card "About this role" of a read-only role lists the first five holders (`ListRoleHolders`) with `Identity format="cell"`. `identityKindOf(holder)` reads `actorKind` and `runner`, so the reader sees if a holder is a person, an agent or another app.
- `presentation/roles.commands.ts`: "Create role...", for the search bar, one command per level.
- `changeInstanceRoles`: `Grant` and `Revoke` on the platform, for the dialog of the users page.

## Rules

- The server owns the catalog. `ListPermissionCatalog` gives the areas, the actions and `depends_on`. Do not write a list of permissions here. A label comes from `areaLabels`, and an unknown area shows its id.
- The holders and the owner of a role do not change after the creation. The level changes only while the role has no holder, and the server checks it again (`ROLE_IN_USE`). A change of the level fits the permissions to the new level.
- `PermissionTable` with no `onChange` is the read-only table.
- A bulk select or clear uses `checkPermissions` and `uncheckPermissions` (`catalog.struct.ts`). They apply `togglePermission` to each cell, so the result is the same as one click on each cell, with the `depends_on` rules.
- `depends_on` can name a permission of another area, and a dependency can have its own dependencies. `togglePermission` follows them all, as the server does. A cell tells on hover what a click on it also checks (`cellTitle` in `presenters/permission-table.presenter.ts`).
- The holders of an instance role need `MANAGE_ROLES`: on the instance, `list_role_holders` comes with `create_role`, not with `list_roles`. "See members" shows only when the user can open the page of the people (`canSeePeople`).
- A built-in role does not change, so it never opens in the editor.
- New strings go in `messages/roles.messages.ts`.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
New strings: `pnpm extract && pnpm compile`.
