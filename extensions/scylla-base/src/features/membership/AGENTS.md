# `features/membership` — agent guide

Who belongs to an organization or a project, and with which roles.

**Layer** `features/` · **id** `membership` · **DI key** none (`domain: {}`)

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type ScopeMember, MemberRole
MemberRoleOrigin                      (enum — a value, not a type)
buildOrganizationMembers, buildProjectMembers
membershipPoints                      the extension points (see below)
type OrganizationMembersContext, ProjectMembersContext, AddMemberAction
```

**This module is Svelte** (Phase 3). The two hooks that used to be exported are gone: they
were view models, not API, and nothing outside this feature ever called them. What is left is
the pure domain, which is the only part another module would want.

Both pages are **deliberately not exported**: `membership.module.ts` loads them lazily, and a
barrel that re-exported them would pull them into the chunk of anything importing this module.
Never add: `membership.module.ts`, pages.

## Data contract

**This module owns no repository.** `domain` is `{}`; it is registered for its routes alone.
There is no `use-membership-domain.ts`, and adding one would be wrong.

It composes, through public APIs only:

| From | Used for |
|---|---|
| `features/roles` | `roleQueries` (`grantable`, `catalog`, `organizationCatalog`, `scopedGrants`), `grantMutations`, `roleConfers`, `humanizeRoleId`, `scopeLabelOf`, `RoleEntity` |
| `features/organization` | organization member list |
| `features/project` | project member list |
| `features/user` | `UserSummary` (the person type) and the directory, for display names and emails |
| `@shared/presentation/ui` | `UserIdentity`, `userName`: how a person shows |
| `@platform/authz` | `PrincipalKind`, `PermissionScope`, `Permission`, `can` |

**This module reads the grants through `roleQueries.scopedGrants`**, the same factory that
`roles` uses — so one resource has exactly one query key.

## Layout

```
membership.module.ts                 routes + nav, empty domain
index.ts                             public API
domain/structs/scope-member.struct.ts   ScopeMember, MemberRole, MemberRoleOrigin +
                                        buildOrganizationMembers / buildProjectMembers (pure)
presentation/
  membership.points.ts               the extension points (see below)
  ui/OrganizationMembers.page.svelte, ProjectMembers.page.svelte
  ui/scope-membership.state.svelte.ts   grants → members, plus grant/revoke/refresh (a ViewModel
                                        of both pages)
  ui/membership.messages.ts          every string — `lingui extract` cannot read `.svelte`
  ui/components/                     AddMemberDialog (+ AddMemberForm), AddRoleSelect,
                                     MemberCard, MemberRoleBadges, MemberRowAction,
                                     MembersHint, MembersList, RoleChecklist
  ui/components/index.ts             local barrel — internal, not the module's public API
  ui/components/assignable-roles.state.svelte.ts   which roles *this* user may hand out
  ui/components/assignable-roles.calculator.ts     pure: grantable → AssignableRole (no apps
                                     roles), and the grouping by owner the pickers render
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
| `membership.organizationActions` | zone | `OrganizationMembersContext` | The header actions of the organization page. Its own child is the "Add a member" button: inject with `before`, `after` (the default) or `replace`. |
| `membership.organizationSection` | zone | `OrganizationMembersContext` | Under the members list. No default content. |
| `membership.organizationAddMember` | value | `AddMemberAction` | How the "Add a member" button shows. Default `{ withoutDirectory: 'deny', variant: 'default' }`. |
| `membership.projectActions` | zone | `ProjectMembersContext` | The header actions of the project page. Its own child is the "Add a member" button. |
| `membership.projectSection` | zone | `ProjectMembersContext` | Under the members list and the hint. No default content. |

`OrganizationMembersContext` is `{ organizationId, organizationName, canManage, memberCount,
refreshMembers }`. `ProjectMembersContext` is `{ organizationId, projectId, canManage,
memberCount, refreshMembers }`. `canManage` is `MANAGE_ORG_GRANTS` on the organization or
`MANAGE_PROJECT_GRANTS` on the project. `memberCount` is the number of people that the page
lists. `refreshMembers()` reloads the member list and the grants of the scope: call it after a
change that the page did not make.

- **The "Add a member" button picks a person in the user directory**, thus it needs `LIST_USERS`
  and `MANAGE_ORG_GRANTS`. Without one of them, the button is denied (`aria-disabled`) and its
  dialog does not open. The reason without `MANAGE_ORG_GRANTS`: "You don't have permission to
  admit members here". The reason without `LIST_USERS`: "Only a system admin can browse the
  users".
- **An extension with its own way to add a member** (for example an invitation by email)
  patches `membership.organizationAddMember` to `{ withoutDirectory: 'hide', variant: 'outline' }`
  and injects its own button in `membership.organizationActions`. Then a user without
  `LIST_USERS` sees only the button of the extension, and a system admin sees both.
- **A zone component checks its own permission.** The route guard of the page is
  `LIST_ORGANIZATION_MEMBERS` (or `LIST_PROJECT_MEMBERS`), not the permission of a write. Use
  `permission` on `inject`, or `when: context => context.canManage`.

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `organization` | `members` | `LIST_ORGANIZATION_MEMBERS` | `OrganizationMembers.page.svelte` |
| `project` | `members` | `LIST_PROJECT_MEMBERS` | `ProjectMembers.page.svelte` |

The project page takes `projectId` as a **prop**: route params are the one thing a Svelte page
cannot read from a singleton, so the router gives them as props (`@scylla/core-sdk`).

Sidebar: one entry only — section `organization`, order `30`, icon `UsersRound`, gated on
`LIST_ORGANIZATION_MEMBERS`. The project page is reached from inside a project, not the org nav.

## Rules that bite here

- **A member is a derived view of grants, not a stored list.** `buildOrganizationMembers` and
  `buildProjectMembers` fold grants + identities into `ScopeMember[]`. They are pure functions
  in `domain/` — put membership logic there, not in a component or a `useMemo`.
- **A member shows with `UserIdentity`** (`@shared/presentation/ui`), never with a local avatar
  and name. The pages build one `userId → UserSummary` map: the members lists, and on the
  organization page the user directory over them when `LIST_USERS` allows it (display name and
  email). A member that no list knows shows as "Deleted user", never by its id; on the project
  page, without `LIST_ORGANIZATION_MEMBERS`, as "Unknown user" (`missing="unknown"`): a holder
  through the organization is then simply not named. The project page waits for the
  organization members and grants before it lists anyone, so no name flashes. A name in a
  sentence (a confirmation, a toast, a select) is `userName(user)`.
- **`MemberRoleOrigin` is the load-bearing distinction.** `DIRECT` = granted at this scope;
  `INHERITED` = granted at the organization and visible on the project. Only `DIRECT` roles are
  revocable here — revoking an inherited role means going to the organization. Never render the
  two identically.
- `createAssignableRoles(scope, organizationId)` exists because you may only grant roles you are
  allowed to grant. Its list is `roleQueries.grantable(undefined, organizationId)`, filtered on
  `scope`: the platform roles and the roles of this organization. It asks for every scope so that
  `labelFor` names a role inherited from the organization on a project page, never by its id. Do
  not bypass it and list every role from `roleQueries.catalog`: that list holds the roles of
  other organizations too.
- **A member is a person: a role for apps (`RoleKind.AGENT`) is never offered.**
  `assignableForPeople` drops them; the backend would refuse the grant anyway.
- **The pickers group by owner.** `AddRoleSelect` and `RoleChecklist` render
  `groupAssignableRoles`: "<organization> roles" first, then "Platform roles", an empty group left
  out. They take `organizationName` for the first header; `MembersList`, `MemberCard` and
  `AddMemberDialog` pass it through.
- `AddRoleSelect` resets its own value after each pick: the chosen role leaves the list, and a
  value without an item would show its raw id in the trigger.
- Two pages, one shape: keep the shared components scope-agnostic and pass the scope in. Do not
  fork `MembersList` per scope.
- **New strings go in `ui/membership.messages.ts`, never inside a `.svelte`.** Extraction does
  not read components, so a message declared there vanishes from the catalogs without failing a
  gate.
- **The role-count plural is load-bearing and has a French test.** `<Plural _0=…>` became
  `plural(value, { 0: … })`; the two compile to the same `=0 {…}` arm, which is what kept the
  translation attached. `MemberCard.fr.test.ts` is what proves it — no gate would have.
- `AddMemberDialog` splits into a dialog and an `AddMemberForm` on purpose: the form owns the
  selection, so `{#key open}` on it *is* the reset React needed an effect for.
- A bits-ui select's options live in a floating layer jsdom hides. Reach them with
  `findFloating('option', …)` from `test/render.ts`, never `getByText`.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
