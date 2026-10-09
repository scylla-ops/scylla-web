# `features/user` — agent guide

User accounts: the system-wide directory, the page of one user for an administrator, and the
account page of the signed-in user.

**Layer** `features/` · **id** `user` · **DI key** `userRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

**Presentation is Svelte** (Phase 2 of `refacto_svelte.md`). There is no
`use-<feature>-domain.ts` and no hooks: reads and writes are declared as options objects in
`presentation/*.queries.ts`, which a component or another feature runs with `createQuery`.

## Public API — `index.ts`

```typescript
type UserEntity, UserSummary, CreateUserInput, UpdateUserInput, UserAccess
userQueries        list · byId · me · access
userMutations      create · update · remove · setActive · changePassword · sendPasswordReset ·
                   revokeSessions · deleteAccount
canListUsers, USERS_QUERY_KEY, USER_QUERY_KEY, ME_QUERY_KEY, USER_ACCESS_QUERY_KEY
```

`roles`, `membership`, `organization`, `project` and `shell` use this barrel. The shell runs
`userQueries.me` in its user menu, on the same cache entry as the account page.
`userQueries.byId` and `userQueries.access` check for themselves (the SDK gives them to other
extensions): the own id of the session needs no grant, any other id needs `READ_USER`.

**`UserSummary` is the one type for a person** (`userId`, `username`, `email?`,
`displayName?`): a `Pick` of `UserEntity`. The member lists of `organization` and `project`
return it, because their RPCs carry no more. Show it with `UserIdentity` from
`@shared/presentation/ui`, never with a local avatar and name.

Never add: `user.module.ts`, a page or a component (export a loader if another module ever needs
one).

## Data contract

`UserRepository` — `domain/repository/user.repository.ts`:

| Method | RPC | Returns |
|---|---|---|
| `getAll()` | `ListUsers` | `UserList` (= `PaginatedList<UserEntity>`) |
| `getById(id)` | `GetUser` | `UserEntity` |
| `getMe()` | `GetMe` | `UserEntity` |
| `create(CreateUserInput)` | `CreateUser` | `UserEntity` |
| `update(UpdateUserInput)` | `UpdateUser` | `UserEntity` |
| `delete(userId)` | `DeleteUser` | `void` |
| `setActive(userId, isActive)` | `SetUserActive` | `UserEntity` |
| `changePassword(current, next)` | `ChangePassword` | `void` |
| `sendPasswordReset(userId)` | `SendPasswordReset` | `PasswordResetDelivery` (from `login`) |
| `revokeSessions(userId)` | `RevokeUserSessions` | `number` (sessions revoked) |
| `deleteAccount(password)` | `DeleteAccount` | `void` |
| `listAccess(userId)` | `ListUserAccess` | `UserAccess[]` |

`UpdateUserInput` holds the changed fields only: an absent field stays absent on the wire, and
the server leaves it unchanged. `profileChanges` (`user.entity.ts`) builds it from the profile
form. `groupUserAccess` (`user-access.struct.ts`) puts the system grants apart and groups the
others by organization.

## Layout

```
user.module.ts                       routes + nav + DI wiring (private; registry only)
index.ts                             public API
domain/
  entities/user.entity.ts            UserEntity, UserSummary, the inputs, profileChanges (pure)
  structs/user.struct.ts             UserList = PaginatedList<UserEntity>
  structs/user-access.struct.ts      UserAccess, groupUserAccess (pure)
  repository/user.repository.ts
infrastructure/
  repository/data-sources/user-remote.data-source.ts     interface
  data/remote/user-remote.data-source.impl.ts            impl (the `.impl.ts` convention)
  repository/mappers/grpc-user.mapper.ts                 user, requests, access, delivery
  repository/default-user.repository.ts
presentation/
  user.queries.ts                    the reads, the writes, `canListUsers`
  account-page.state.svelte.ts       createAccountPage: the account of the session
  user-detail.state.svelte.ts        createUserDetail: the page of another user
  ui/user.messages.ts                every string the screens show
  ui/admin/UserAdmin.page.svelte     the directory
  ui/admin/AddUserDialog/            "New user"
  ui/admin/user-table/               UserTable, user-columns.ts
  ui/account/Account/                the account page
  ui/account/PersonalAccount/         the account page with no organization: + the sign-out at the end
  ui/account/ChangePasswordForm.svelte, DeleteAccountDialog/
  ui/user-detail/UserDetail/         the page of another user
  ui/user-detail/UserDetailHeader.svelte, UserSecurity.svelte
  ui/components/                     SettingsSection, UserStatusBadge, UserProfileForm/,
                                     UserAccessList/ (both pages)
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `organization` | `users` | `LIST_USERS` | `UserAdmin.page.svelte` |
| `organization` | `users/me` | (redirect) | to `account` |
| `organization` | `users/:userId` | none on the route (`UNGATED_PAGES`); the page asks `READ_USER` | `UserDetail.page.svelte` |
| `organization` | `account` | none (`UNGATED_PAGES`) | `Account.page.svelte` |
| `personal` | `account` (`/account`) | none (`UNGATED_PAGES`) | `PersonalAccount.page.svelte`: `Account.page.svelte`, then the sign-out |

Sidebar: one entry, section **`system`** (not `organization`), order `10`, icon `UsersIcon`.
The user menu of the shell opens the `account` of the organization
(`scyllaNavigate.goToAccount`, which gives `/account` when no organization is active). The
first-organization screen and the `personal` layout link to `/account`: the same page, for a
user who has no organization.

## Rules that bite here

- **`user` is system-wide, not org-scoped.** It is the directory of every account in the
  installation — hence the `system` sidebar section. Do not filter it by the current
  organization; "who is in this org" is [`membership`](../membership/AGENTS.md)'s question.
  The user permissions are SYSTEM level: `can(Permission.X)` needs no target.
- **The own account has its own page.** `account` calls the RPCs on the own id, which need no
  grant. `users/:userId` sends the own id to `account` (`<Redirect to="../../account">`), and
  the directory opens `account` for the own row. The old path `users/me` redirects there too.
  "Who am I" is `userQueries.me` (`GetMe`), not `localStorage`.
- **`users/:userId` declares no permission on purpose.** The route guard would deny an old link
  to `/users/<own id>` to a user without `READ_USER` before the page could redirect it. The page
  sends the own id to `account` first, then wraps the rest in `RequirePermission`
  (`READ_USER`); its reads are enabled only with `READ_USER`.
- **A layout cannot put content after its page.** The router places a page in an absolute,
  stacked box (`PageTransition`): what a layout renders after `children` lands on top of the
  page. So the sign-out of `/account` is in `PersonalAccount.page.svelte`, after the danger zone.
- **Read `isLoading` of a query on the first render.** A query result tracks only the fields
  that something reads: a field read for the first time after the data arrived keeps its old
  value. The page of a user reads `page.isLoading` in its first condition, before any branch
  that can hide it.
- **Gate each action of `users/:userId` with the permission of its RPC, and hide what the viewer
  cannot do.** Save, reset link, sign out everywhere, deactivate and reactivate: `UPDATE_USER`.
  The email is editable only with `CREATE_USER` too (the proto rule). Delete: `DELETE_USER`.
  The own account page never sends an email.
- **A FAILED_PRECONDITION that a page shows beside a field is data, not an error.**
  `changePassword` and `deleteAccount` return the server message through `refusalOf`
  (`@shared/utils/scylla-result.ts`): `null` on success. The global handler would toast it a
  second time. `deleteAccount` signs out in its own `onSuccess`, not in the caller's: TanStack
  skips the callbacks of a `mutate` call when the component is gone. `remove` drops the queries
  of the deleted user (`removeQueries`), it does not only refresh them. On the page of another user, a FAILED_PRECONDITION goes to the global toast, as
  the server wrote it.
- **Every form checks its values in the app** (`@shared/utils/account-validation.ts`): email
  format, password 8 to 255 characters and not spaces only, confirmation equal to the new
  password, username with no '@' and 255 bytes at most, display name 100 characters at most. Every form with a
  new password has a confirmation field. Every field has its `autocomplete` value.
- Passwords are write-only: no read returns one. Never log, store or display one.
- `getAll()` is paginated (`UserList`). Use `createPagination()` + `DataTable`; do not render
  an unpaginated directory.
- Users are principals in the authz model: deleting one removes their grants. Confirm through
  `ConfirmOperationAlertDialog`.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
