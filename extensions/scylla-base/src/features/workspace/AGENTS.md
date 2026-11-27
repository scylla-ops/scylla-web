# `features/workspace` — agent guide

Workspaces: the top-level tenant, its members, the switcher in the shell, and the list of all the
workspaces in the administration.

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

**The switcher of a user with `LIST_ALL_WORKSPACES` (an instance admin) has two sections.** "Your
workspaces" holds the workspaces where the user is an owner or has a role (`mine`). "Other
workspaces" holds `OTHERS_LIMIT` (5) workspaces of other users, the last active first, from
`workspaceQueries.all` with `othersOnly`. Each of these rows shows the icon of the workspace, then
the owner (avatar and name, with the email or the handle as the hint). The filter field always shows. It matches the own workspaces
in the browser, with the owner, and it asks the server for the others after a pause
(`SEARCH_DELAY_MS`). The last row, "All workspaces…", opens `/admin/workspaces?q=<text>`. It shows the count of the rows of that page: the own workspaces that match, plus the `total` of `listAll`. The
switcher of the other users does not change: no section, no owner, no call to `listAll`.

**Never list all the workspaces in one call.** `getMine` gives only the own workspaces, also to an
instance admin (`only_with_role`). The others come one page at a time from `listAll`. A workspace
that is not in `mine` (the workspace of another user that an admin opens) comes from `bySlug` or
`byId`. `createWorkspaceOf(id)` gives it from `mine`, else from `byId`: the settings page and the
time zone of the dashboard use it.

## Public API — `index.ts`

```typescript
type WorkspaceEntity
type WorkspaceOwnerEntity, WorkspaceOrder, WorkspaceSearch, WorkspacePage
workspaceQueries        mine · members · all · bySlug · byId
workspaceMutations      create (with an icon: a second UpdateWorkspace) · update (with the icon) ·
                        setIcon · setPersonalTokens · setTimeZone · remove
invalidateWorkspaceMembers
WORKSPACES_QUERY_KEY, MY_WORKSPACES_QUERY_KEY, WORKSPACE_MEMBERS_QUERY_KEY, ALL_WORKSPACES_QUERY_KEY
createWorkspaceOf       the workspace of an id: from `mine`, else from the server
createWorkspaceItems
workspaceIconProps      the icon of a workspace → the props of EntityIcon (the switcher and the
                        command bar of the shell)
workspaceIconChange     IconChoice of an IconField → CustomIconChange (the first-workspace screen)
DEFAULT_WORKSPACE_GLYPH, DEFAULT_WORKSPACE_COLOR   a building in grey
OTHERS_LIMIT, SEARCH_DELAY_MS, allWorkspacesHref, ownerName, ownerHint,
workspaceRoleLabel, workspaceCounts     the owner, the role and the counts of a row (the command bar)
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
| `getMine()` | `WorkspaceEntity[]`: the workspaces where the user is an owner or has a role, with their details |
| `listAll(search)` | `WorkspacePage`: one page of all the workspaces, with the total. PERMISSION_DENIED without `LIST_ALL_WORKSPACES` |
| `getBySlug(slug)`, `getById(id)` | `WorkspaceEntity`, with its details |
| `listMembers(workspaceId)` | `UserSummary[]` (from `user`: the RPC carries an id and a username) |

The details of a workspace (`owner`, `memberCount`, `projectCount`, `lastActivityAt`, `role`) come
in a list beside the workspaces of the answer: `withDetails` joins them by id. `role` is empty when
the user has no role and an instance role shows the workspace. The email of the owner comes only
to a user that sees each workspace. Reach the repository with `getModuleDomain` **inside
`workspace.queries.ts` only**.

## Layout

```
workspace.module.ts               DI wiring and the routes (private; registry only)
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
  ui/AddWorkspaceDialog/, EditWorkspaceDialog/   the dialogs; their forms: the icon, the name,
                                    the address
  (WorkspaceIcon)                 in `@shared/presentation/ui`: the other modules show it too
  ui/WorkspaceIconDialog/         the icon picker of @scylla/ui in a dialog; the form saves
  presenters/workspace-icon.presenter.ts   the props of EntityIcon with `imageUrl` (the default
                                    icon is in shared), the choice and the change of the picker
  ui/WorkspaceAdmin/              the list of all the workspaces, in the administration
  workspace-of.state.svelte.ts    createWorkspaceOf
  messages/workspace.messages.ts
  presenters/workspace-form.presenter.ts   the items of the form
  presenters/time-zone.presenter.ts        the rows of the time zone field
  presenters/workspace-owner.presenter.ts  the owner, the role and the counts of a row
```

## Routes & nav

`settings` (`UPDATE_WORKSPACE`): the time zone of the workspace, and the switch of the personal
tokens in this workspace, locked while the server refuses them. The time zone field lists the IANA
names of the browser (`Intl.supportedValuesOf`). The zone of the browser is the first row, with a
hint. The current zone and `UTC` are rows also when the browser does not list them. A pick saves
at once, and the field shows the zone of the server until the save ends. It reads this from `personalTokenQueries`, because only an instance admin
reads the settings of the server.

`admin/workspaces` (`LIST_ALL_WORKSPACES`, the link "Workspaces" of the administration): a table of
all the workspaces. Name (after the icon of the workspace), owner (avatar, name and email),
members, projects, created, last activity. The search (name, slug, owner) and the order run on the server, and the pages use the
token of the server: the state keeps the token of each open page, so "previous" works. The name is
a button, so the keyboard opens a workspace. A click on a row opens it too, with the same switch as
the switcher. On a phone, each row is a card. `?q=` gives the first text of the search. The workspaces and roles of a user show on the pages of [`user`](../user/AGENTS.md),
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
  When both fields are blank and the icon stays, the dialog closes with no call.
- **A workspace has an icon**, as a project: a glyph in a color, or an image (`IconField` and
  `IconPicker` of `@scylla/ui`). No icon: a building in grey. The create dialog of the switcher, the
  first-workspace screen of the shell and `EditWorkspaceDialog` have the field. `CreateWorkspace`
  has no icon: `workspaceMutations.create` sends it in an `UpdateWorkspace` just after, and a toast
  tells when only the icon fails. A click on the icon at the top of the settings opens the picker,
  for a member with `UPDATE_WORKSPACE`. The switcher, its rows (also the rows of the workspaces of
  other users), the list of all the workspaces, the command bar and the settings show the icon.
- `AddWorkspaceDialog` does not set the context: `workspaceMutations.create` makes the new
  workspace active, then the dialog lands on its dashboard. The description is optional
  (`optional: true` in `createWorkspaceItems`), on the first-workspace screen too.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
