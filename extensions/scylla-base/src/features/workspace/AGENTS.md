# `features/workspace` — agent guide

Workspaces: the top-level tenant, its members, and the switcher in the shell.

**Layer** `features/` · **id** `workspace` · **DI key** `workspaceRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

**Presentation is Svelte** (Phase 2 of `refacto_svelte.md`). Domain and infrastructure are
unchanged. There is no `use-<feature>-domain.ts` and no hooks: reads and writes are declared as
options objects in `presentation/workspace.queries.ts`, which a component or another
feature runs with `createQuery`.

**`WorkspaceList` is the one list of workspaces.** The workspace selector of the shell
shows it inside a dropdown menu, and gives it `DropdownMenuItem` as the `row` prop, so each row
gets the keyboard focus of the menu. A row shows the name, a check on the active workspace, and
its actions on hover, in place of the check. Without a `row`, it shows plain rows
(`WorkspaceRow.svelte`). A row component takes `class`, `onSelect` and `children`.

**A row reads its permissions from `createWorkspacePermissions`, not from `can()`.** A row can be
any workspace, and the store of `can()` holds only the active one, so `can()` refuses each other row.
`createWorkspacePermissions` asks the server once for each workspace with
`accessQueries.myScope`, of [`access`](../access/AGENTS.md), and only while the list is mounted.

From 6 workspaces, a filter field shows above the rows, and it holds the focus. Its `onkeydown` stops
each key except Escape and Tab, because the type-ahead of the menu moves the focus to a row.
ArrowDown goes to the first row. Enter opens the first row when the field has text.

## Public API — `index.ts`

```typescript
type WorkspaceEntity
workspaceQueries        mine · members
workspaceMutations      create · update · remove
invalidateWorkspaceMembers
WORKSPACES_QUERY_KEY, MY_WORKSPACES_QUERY_KEY, WORKSPACE_MEMBERS_QUERY_KEY
createWorkspaceItems
loadWorkspaceList         () => import(WorkspaceList.svelte)       ← the shell's selector
loadAddWorkspaceDialog    () => import(AddWorkspaceDialog.svelte)  ← the shell's selector
```

The shell imports this barrel eagerly for the queries, so the components are exported as
**loaders**: a re-exported component would put its UI library in the entry chunk. Never add:
`workspace.module.ts`, a component.

## Data contract

`WorkspaceRepository` — `domain/repository/workspace.repository.ts` (**default** export):

| Method | Returns |
|---|---|
| `getAll()` | `WorkspaceEntity[]` — every org (admin view) |
| `getMine()` | `WorkspaceEntity[]` — the current user's orgs |
| `listMembers(workspaceId)` | `UserSummary[]` (from `user`: the RPC carries an id and a username) |

`getAll` vs `getMine` is a real distinction — the switcher must use `getMine`. Reach the
repository with `getModuleDomain` **inside `workspace.queries.ts` only**.

## Layout

```
workspace.module.ts               DI wiring, no route (private; registry only)
index.ts                             public API
domain/
  entities/workspace.entity.ts    WorkspaceEntity
  repository/workspace.repository.ts
infrastructure/
  default-workspace.repository.ts   WorkspaceServiceClient → WorkspaceEntity
  grpc-workspace.mapper.ts
  grpc-workspace-member.mapper.ts
presentation/
  workspace.commands.ts           "Create workspace...", for the search bar
  workspace.queries.ts            every read and write, plus the key factories
  ui/WorkspaceList/               the list; the shell's selector gives it its rows
  ui/AddWorkspaceDialog.svelte, EditWorkspaceDialog.svelte
  messages/workspace.messages.ts
  presenters/workspace-form.presenter.ts   the items of the form
```

## Routes & nav

`settings` (`UPDATE_WORKSPACE`): the switch of the personal tokens in this workspace, locked while
the server refuses them. It reads this from `personalTokenQueries`, because only an instance admin
reads the settings of the server. No other page. The workspaces and roles of a user show on the pages of [`user`](../user/AGENTS.md),
from `ListUserAccess`; that module does not import this one for them.

## Rules that bite here

- `WORKSPACE_MEMBERS_QUERY_KEY` is exported so `membership` invalidates the same entry this
  module reads. Never hand-write the key.
- The shell depends on `WorkspaceList` / `AddWorkspaceDialog`. Changing their props is a
  breaking change for `shell/` — update `WorkspaceSelector` in the same commit.
- `workspaceMutations.update` invalidates all the queries, because members, roles, apps and
  notifications also hold the name of the workspace. `create` and `remove` invalidate only the
  list: a full invalidation after a delete refetches the pages of the deleted workspace, and these
  give error toasts.
- A blank field of `EditWorkspaceDialog` means no change, so a rename does not need a new address.
  When both fields are blank, the dialog closes with no call.
- `AddWorkspaceDialog` does not set the context: `workspaceMutations.create` makes the new
  workspace active, then the dialog lands on its dashboard. The description is optional
  (`optional: true` in `createWorkspaceItems`), on the first-workspace screen too.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
