# `features/membership` — agent guide

Who belongs to an workspace or a project, and with which roles.

**Layer** `features/` · **id** `membership` · **DI key** none (`domain: {}`)

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type MemberRow
buildMemberRows, buildProjectMemberRows
membershipPoints                      the extension points (see below)
type WorkspaceMembersContext, ProjectMembersContext, AddMemberAction
```

The pages are **deliberately not exported**: `membership.module.ts` loads them lazily.
Never add: `membership.module.ts`, pages.

## Data contract

**This module owns no repository.** `domain` is `{}`; it is registered for its routes alone.

It composes, through public APIs only:

| From | Used for |
|---|---|
| `features/access` | `accessQueries` (`members`, `memberAccess`, `held`), `accessMutations` |
| `features/roles` | `roleQueries` (`list`, `catalog`), `roleName`, `missingPermissionIds`, `permissionLabel` |
| `features/project` | the projects of the workspace |
| `features/invitation` | an email in the add dialog makes an invitation |
| `features/user` | the directory, for a name in the add dialog and for the emails |
| `features/apps` | the apps of the workspace, for the Apps tab |
| `@platform/authz` | `Permission`, `can` |

## Rules

- Teams and Check access are not in this module. Do not show them.
- The server sends no role of the instance here (decision 92 of the backend): an instance admin with no role here is not a member, and a member shows only its roles on the workspace and on its projects. `Instance › Users` shows the instance admins.
- A person needs a role in the workspace first: the add dialog gives the workspace roles before the project roles. The server takes the project roles with the last workspace role.
- Workspace owner is a built-in role. `Grant` and `Revoke` change it, and they need `manage_owners`: only an owner or an instance admin has it. A workspace can have no Workspace admin, and it always has an owner. The last owner stays, and a dialog says so before the call. An invitation does not carry this role.
- An invitation carries one built-in workspace role. The project roles come after the person accepts, and the add dialog says so.
- A role on the workspace passes a check on a project (`Check::within` in the backend). Thus the Project roles column of the members table starts with one pill `All projects · <project role>`. `ALL_PROJECTS_ROLES` gives the project role with the same permissions on a project, and the strongest workspace role gives the pill. The pill has the fill of a workspace role, because the access comes from that role. App creator gives no project access, so it has no pill. A custom workspace role has no pill, because `MemberRoleEntity` has no permissions.
- A name finds a person only with `users.view`. Another caller types an email.
- `ChangeRolesDialog` shows the `roles` prop. A page keeps only the actor and the name of the dialog, and derives `roles` from its query. A copy of a row does not change after a reload, so the dialog shows old roles. `onChanged` returns the reload: the boxes ignore a click until it ends. The boxes are `readonly`, not `disabled`, so the focus stays on the box. The server gives no member when a person loses the last workspace role: the name stays in the page, and the dialog stays open with no role.
- `ChangeRolesDialog` is a checklist (`RoleChoiceRow`, `role-choices.presenter.ts`). Each click applies at once, and the row shows the result: there is no success toast. The order of the rows does not change when a role changes. Only a role to give can lock: `Revoke` has no escalation check, so a held role does not lock. A refusal shows on its row, and the box goes back. If the dialog closed during the save, the refusal goes to a toast.
- The dialog asks before the last workspace role of a person goes, because the server also takes the project roles (decision 88 of the backend). It does not ask for an app, because the server keeps the project roles of an app. It does not ask for a person who is also an owner, because that person stays.
- `otherRoles` shows the roles of the other scopes as read only, with a link to the page that changes them. `can()` reads only the active scopes, so it cannot gate a link to another project: the route guard decides.
- An app gets a role from the Apps tab of the members, or on the members of a project. Only the apps of the workspace are in the list. `?addApp=<id>` is a direct link: an app of another workspace gets a dialog that says why not.

## Layout

```
membership.module.ts                 routes + nav, empty domain
index.ts                             public API
presentation/
  membership.points.ts               the extension points (see below)
  presenters/scope-members.presenter.ts   ScopeMember, MemberRole, MemberRoleOrigin +
                                     buildWorkspaceMembers / buildProjectMembers (pure)
  presenters/assignable-roles.presenter.ts   grantable → AssignableRole (no apps roles), and
                                     the grouping by owner the pickers render
  ui/WorkspaceMembers.page.svelte, ProjectMembers.page.svelte
  ui/scope-membership.state.svelte.ts   grants → members, plus grant/revoke/refresh (a ViewModel
                                        of both pages)
  messages/membership.messages.ts          every string — `lingui extract` cannot read `.svelte`
  ui/components/                     AddMemberDialog (+ AddMemberForm), AddRoleSelect,
                                     MemberCard, MemberRoleBadges, MemberRowAction,
                                     MembersHint, MembersList, RoleChecklist
  ui/components/index.ts             local barrel — internal, not the module's public API
  ui/components/assignable-roles.state.svelte.ts   which roles *this* user may hand out
```

Both ViewModels take **getters**, not values, for anything that arrives late — the scope id
from the route or the context store, the permission from a store that loads after first paint.
Capturing either once freezes the view on the first, usually empty, render. The React hooks
re-ran on every render and got this for free.

No `infrastructure/` — correct, do not add one.

## Extension points

Full mechanism: `sdks/core-sdk/AGENTS.md`, "Widgets". Defined in `presentation/membership.points.ts`,
listed in `MembershipModule.points` (that names them `membership.*`), exported from this barrel
and from `@scylla/base-sdk`.

| Point | Kind | Context / type | Notes |
|---|---|---|---|
| `membership.workspaceActions` | zone | `WorkspaceMembersContext` | The header actions of the workspace page. Its own child is the "Add a member" button: inject with `before`, `after` (the default) or `replace`. |
| `membership.workspaceSection` | zone | `WorkspaceMembersContext` | Under the members list. No default content. |
| `membership.workspaceAddMember` | value | `AddMemberAction` | How the "Add a member" button shows. Default `{ withoutDirectory: 'deny', variant: 'default' }`. |
| `membership.projectActions` | zone | `ProjectMembersContext` | The header actions of the project page. Its own child is the "Add a member" button. |
| `membership.projectSection` | zone | `ProjectMembersContext` | Under the members list and the hint. No default content. |

`WorkspaceMembersContext` is `{ workspaceId, workspaceName, canManage, memberCount,
refreshMembers }`. `ProjectMembersContext` is `{ workspaceId, projectId, canManage,
memberCount, refreshMembers }`. `canManage` is `MANAGE_WORKSPACE_GRANTS` on the workspace or
`MANAGE_PROJECT_GRANTS` on the project. `memberCount` is the number of people that the page
lists. `refreshMembers()` reloads the member list and the grants of the scope: call it after a
change that the page did not make.

- **The "Add a member" button picks a person in the user directory**, thus it needs `LIST_USERS`
  and `MANAGE_WORKSPACE_GRANTS`. Without one of them, the button is denied (`aria-disabled`) and its
  dialog does not open. The reason without `MANAGE_WORKSPACE_GRANTS`: "You don't have permission to
  admit members here". The reason without `LIST_USERS`: "Only a system admin can browse the
  users".
- **An extension with its own way to add a member** (for example an invitation by email)
  patches `membership.workspaceAddMember` to `{ withoutDirectory: 'hide', variant: 'outline' }`
  and injects its own button in `membership.workspaceActions`. Then a user without
  `LIST_USERS` sees only the button of the extension, and a system admin sees both.
- **A zone component checks its own permission.** The route guard of the page is
  `LIST_WORKSPACE_MEMBERS` (or `LIST_PROJECT_MEMBERS`), not the permission of a write. Use
  `permission` on `inject`, or `when: context => context.canManage`.

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `workspace` | `members` | `LIST_WORKSPACE_MEMBERS` | `WorkspaceMembers.page.svelte` |
| `project` | `members` | `LIST_PROJECT_MEMBERS` | `ProjectMembers.page.svelte` |

The project page takes `projectId` as a **prop**: route params are the one thing a Svelte page
cannot read from a singleton, so the router gives them as props (`@scylla/core-sdk`).

Sidebar: one entry only — section `workspace`, order `30`, icon `UsersRound`, gated on
`LIST_WORKSPACE_MEMBERS`. The project page is reached from inside a project, not the org nav.

## Rules that bite here

- **A member is a derived view of grants, not a stored list.** `buildWorkspaceMembers` and
  `buildProjectMembers` fold grants + identities into `ScopeMember[]`. They are pure functions
  in `domain/` — put membership logic there, not in a component or a `useMemo`.
- **A member shows with `UserIdentity`** (`@shared/presentation/ui`), never with a local avatar
  and name. The pages build one `userId → UserSummary` map: the members lists, and on the
  workspace page the user directory over them when `LIST_USERS` allows it (display name and
  email). A member that no list knows shows as "Deleted user", never by its id; on the project
  page, without `LIST_WORKSPACE_MEMBERS`, as "Unknown user" (`missing="unknown"`): a holder
  through the workspace is then simply not named. The project page waits for the
  workspace members and grants before it lists anyone, so no name flashes. A name in a
  sentence (a confirmation, a toast, a select) is `userName(user)`.
- **`MemberRoleOrigin` is the load-bearing distinction.** `DIRECT` = granted at this scope;
  `INHERITED` = granted at the workspace and visible on the project. Only `DIRECT` roles are
  revocable here — revoking an inherited role means going to the workspace. Never render the
  two identically.
- `createAssignableRoles(scope, workspaceId)` exists because you may only grant roles you are
  allowed to grant. Its list is `roleQueries.grantable(undefined, workspaceId)`, filtered on
  `scope`: the platform roles and the roles of this workspace. It asks for every scope so that
  `labelFor` names a role inherited from the workspace on a project page, never by its id. Do
  not bypass it and list every role from `roleQueries.catalog`: that list holds the roles of
  other workspaces too.
- **A member is a person: a role for apps (`RoleKind.AGENT`) is never offered.**
  `assignableForPeople` drops them; the backend would refuse the grant anyway.
- **The pickers group by owner.** `AddRoleSelect` and `RoleChecklist` render
  `groupAssignableRoles`: "<workspace> roles" first, then "Platform roles", an empty group left
  out. They take `workspaceName` for the first header; `MembersList`, `MemberCard` and
  `AddMemberDialog` pass it through.
- `AddRoleSelect` resets its own value after each pick: the chosen role leaves the list, and a
  value without an item would show its raw id in the trigger.
- Two pages, one shape: keep the shared components scope-agnostic and pass the scope in. Do not
  fork `MembersList` per scope.
- **New strings go in `messages/membership.messages.ts`, never inside a `.svelte`.** Extraction does
  not read components, so a message declared there vanishes from the catalogs without failing a
  gate.
- **The role-count plural is load-bearing and has a French test.** `<Plural _0=…>` became
  `plural(value, { 0: … })`; the two compile to the same `=0 {…}` arm, which is what kept the
  translation attached. `MemberCard.fr.test.ts` is what proves it — no gate would have.
- `AddMemberDialog` splits into a dialog and an `AddMemberForm` on purpose: the form owns the
  selection, so `{#key open}` on it is the reset: no effect.
- A bits-ui select's options live in a floating layer jsdom hides. Reach them with
  `findFloating('option', …)` from `test/render.ts`, never `getByText`.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
