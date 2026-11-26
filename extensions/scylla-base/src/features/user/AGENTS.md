# `features/user` — agent guide

User accounts: the system-wide directory, the page of one user for an administrator, and the
account page of the signed-in user.

**Layer** `features/` · **id** `user` · **DI key** `userRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

Reads and writes are declared as options objects in `presentation/*.queries.ts`, which a
component or another feature runs with `createQuery`.

## Public API — `index.ts`

```typescript
type UserEntity, UserSummary, CreateUserInput, UpdateUserInput, UserAccess, UserSessionEntity
userQueries        list · byId · me · access · sessions
userMutations      create · update · updateAvatar · importAvatar · remove · setActive · changePassword · sendPasswordReset ·
                   revokeSessions · revokeSession · deleteAccount · exportAccountData
canListUsers, USERS_QUERY_KEY, USER_QUERY_KEY, ME_QUERY_KEY, USER_ACCESS_QUERY_KEY,
USER_SESSIONS_QUERY_KEY
loadAccountDeletion   // loader of AccountDeletion (props `open`, `onOpenChange`): the auth guard
                      // opens it from the terms step of `login`
openProfilePhoto      // Account > Profile, with the photo card in view: a click on the own
                      // avatar in the user menu of the shell
```

`roles`, `membership`, `workspace`, `project` and `shell` use this barrel. The shell runs
`userQueries.me` in its user menu, on the same cache entry as the account page.
`userQueries.byId`, `userQueries.access` and `userQueries.sessions` check for themselves (the
SDK gives them to other extensions): the own id of the session needs no grant, any other id
needs `READ_USER`.

**`UserSummary` is the one type for a person** (`id`, `username`, `email?`,
`displayName?`, `avatarUrl?`, `avatarColor?`): a `Pick` of `UserEntity`. The member lists of `workspace` and `project`
return it, because their RPCs carry no more. Show it with `Identity` from
`@shared/presentation/ui`, never with a local avatar and name.

Never add: `user.module.ts`, a page or a component (export a loader, as `loadAccountDeletion`).

## Data contract

`UserRepository` — `domain/repository/user.repository.ts`:

| Method                             | RPC                  | Returns                                               |
| ---------------------------------- | -------------------- | ----------------------------------------------------- |
| `getAll()`                         | `ListUsers`          | `UserList` (= `PaginatedList<UserEntity>`)            |
| `getById(id)`                      | `GetUser`            | `UserEntity`                                          |
| `getMe()`                          | `GetMe`              | `UserEntity`                                          |
| `create(CreateUserInput)`          | `CreateUser`         | `UserEntity`                                          |
| `update(UpdateUserInput)`          | `UpdateUser`         | `UserEntity`                                          |
| `updateAvatar(UpdateAvatarInput)`  | `UpdateProfile`      | `UserEntity` (own account: photo or initials color)   |
| `importAvatar(provider, subject)`  | `ImportAvatar`       | `UserEntity` (own account: the photo of a provider)   |
| `delete(userId)`                   | `DeleteUser`         | `void`                                                |
| `setActive(userId, isActive)`      | `SetUserActive`      | `UserEntity`                                          |
| `changePassword(current, next)`    | `ChangePassword`     | `void`                                                |
| `sendPasswordReset(userId)`        | `SendPasswordReset`  | `PasswordResetDelivery` (from `login`)                |
| `revokeSessions(userId)`           | `RevokeUserSessions` | `number` (sessions revoked)                           |
| `listSessions(userId)`             | `ListUserSessions`   | `UserSessionEntity[]`, the most recently active first |
| `revokeSession(userId, sessionId)` | `RevokeUserSession`  | `void`                                                |
| `deleteAccount(password)`          | `DeleteAccount`      | `void`                                                |
| `exportAccountData()`              | `ExportAccountData`  | `AccountDataExport` (one JSON text and its time)      |
| `listAccess(userId)`               | `ListUserAccess`     | `UserAccess[]`                                        |

`UpdateUserInput` holds the changed fields only: an absent field stays absent on the wire, and
the server leaves it unchanged. `profileChanges` (`presenters/profile-form.presenter.ts`) builds
it from the values of the profile form: it reads a form, so it is not domain. `UserAccess` is a
union on `scope` of `SystemAccess`, `WorkspaceAccess` and `ProjectAccess`: a system grant has
no workspace, an workspace grant has no project. Narrow on `scope` before you read a name.
The barrel exports only `UserAccess`, because `dashboard` already exports another
`ProjectAccess`. The mapper maps a grant that has no workspace as a system grant.
`groupUserAccess` (`presenters/user-access.presenter.ts`) puts the system grants apart and groups
the others by workspace.

## Layout

```
user.module.ts                       routes + nav + DI wiring (private; registry only)
index.ts                             public API
domain/
  entities/user.entity.ts            UserEntity, UserSummary, UserList, UserAccess
                                     (SystemAccess | WorkspaceAccess | ProjectAccess, its
                                     scope is the AccessScope of authz), the inputs,
                                     AccountDataExport
  entities/user-session.entity.ts    UserSessionEntity: no token, only what the list shows
  repository/user.repository.ts
infrastructure/
  default-user.repository.ts         UserServiceClient → UserEntity
  grpc-user.mapper.ts                user, requests, access, session, delivery
presentation/
  user.commands.ts                   the theme, for the search bar
  user.queries.ts                    the reads, the writes, `canListUsers`
  messages/user.messages.ts                every string the screens show
  messages/privacy.messages.ts             the section Privacy and the facts of the deletion
  messages/avatar.messages.ts              the photo and the color of the initials
  ui/admin/UserAdmin.page.svelte     the directory
  ui/admin/AddUserDialog/            "New user"
  ui/admin/user-table/               UserTable, user-table.columns.ts; the Workspaces column shows
                                     each workspace with its WorkspaceIcon and its owner
  ui/account/Account/                the account page: AccountHeader, one section per page,
                                     AccountNav (with no workspace only), AccountSecurity
                                     (password + sessions), ChangePasswordForm, AccountAbout
                                     (the edition and the versions)
    account-page.state.svelte.ts     createAccountPage: the account of the session
    account-sections.registry.ts     ACCOUNT_SECTIONS: the one list of the sections: the links of
                                     the sidebar, AccountNav, the crumb
  ui/account/PersonalAccount/         the account page with no workspace: + the sign-out at the end
  ui/account/AccountPrivacy/          the section `privacy`: one card per subject (your data, the
                                     accepted terms, the privacy policy, cookies and storage),
                                     then a link to the danger zone
    AcceptedTerms.svelte             the last version of the terms that the user accepted
    DataExportPanel.svelte           the export of the account data, in 4 states
    data-export.state.svelte.ts      createDataExport: the mutation, its state, the saved file
  ui/account/DeleteAccountDialog/    what the deletion removes and what stays, a link to the
                                     export, the password
  ui/account/AccountDeletion/        DeleteAccountDialog with its call, for the terms step (no link
                                     to the export: the account page is out of reach there)
  ui/user-detail/UserDetail/         the page of another user, and its parts:
    user-detail.state.svelte.ts      createUserDetail: the page of another user
    UserDetailContent.svelte, UserDetailHeader.svelte (the identity card with status, date and id),
    UserSecurity.svelte
  ui/components/                     SettingsSection, UserStatusBadge, UserProfileForm/,
                                     UserAvatarCard/ (own page only: UserAvatarEditor, the
                                     photo, ProviderPhotoButtons and the color;
                                     photo-focus.state.svelte.ts, the scroll to the card from
                                     `openProfilePhoto`),
                                     UserAccessList/, UserIdentityCard, SessionList,
                                     SessionRow/ (both pages),
                                     ThemePicker/ (own page only)
  presenters/user-agent.presenter.ts parseUserAgent: browser, system and kind of a session
  presenters/session-row.presenter.ts   the title and the activity of a session
  presenters/user-access.presenter.ts   the access of a user, grouped by workspace
  presenters/profile-form.presenter.ts  ProfileValues, profileChanges: the form → UpdateUserInput
  presenters/data-export.presenter.ts   dataExportFile: the name and the size of an export file
```

## Routes & nav

| Mount          | Path                   | Permission                                                     | Component                                                               |
| -------------- | ---------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `admin`     | `users`                | `LIST_USERS`                                                   | `UserAdmin.page.svelte`                                                 |
| `workspace` | `users/me`             | (redirect)                                                     | to `account`                                                            |
| `admin`     | `users/:userId`        | none on the route (`UNGATED_PAGES`); the page asks `READ_USER` | `UserDetail.page.svelte`                                                |
| `workspace` | `account`              | (redirect)                                                     | to `account/profile`                                                    |
| `workspace` | `account/:section`     | none (`UNGATED_PAGES`)                                         | `Account.page.svelte`                                                   |
| `personal`     | `account` (`/account`) | (redirect)                                                     | to `/account/profile`                                                   |
| `personal`     | `account/:section`     | none (`UNGATED_PAGES`)                                         | `PersonalAccount.page.svelte`: `Account.page.svelte`, then the sign-out |

`:section` is `profile`, `appearance`, `security`, `tokens`, `privacy`, `about` or `danger-zone`
(`ACCOUNT_SECTIONS` in `account-sections.registry.ts`). Another value goes to `profile`.

Sidebar: `users` is one entry of the `admin` mount, section **`instance`**, order `10`, icon
`UsersIcon`, under the heading Users and roles.
`account/:section` of the `workspace` mount has one link per entry of `ACCOUNT_SECTIONS`, section
**`account`** (`noRailItem`): the second sidebar shows them on the account page, and the sheet of
a phone shows them there too. The page stays one route, thus a click keeps it mounted
(`inPageParams`). The `personal` mount has no sidebar and no link.
The user menu of the shell opens the `account` of the workspace
(`scyllaNavigate.goToAccount`, which gives `/account` when no workspace is active). The
first-workspace screen and the `personal` layout link to `/account`: the same page, for a
user who has no workspace.

## Rules that bite here

- **The section `profile` has the photo of the user** (`UserAvatarCard`): an image (PNG, JPEG
  or WebP, 1 MB at most, checked with `imageFileProblem` before the upload), or the initials on a
  color: a swatch of `SWATCH_COLORS` or a free `#RRGGBB` color (`ColorSwatches` of `@scylla/ui`,
  the control of the icon picker; a free color is sent 400 ms after the last change). Each action sends `UpdateProfile` at once (`updateAvatar`): empty
  bytes remove the image, an empty color gives the main color. The mapper gives the URL of the
  image (`imageUrl`), so `IdentityAvatar` shows the photo wherever it gets a `UserEntity`: the
  user menu of the shell, the account header, the member lists. The avatar of the account header
  opens `UserAvatarEditor` in a dialog ("Change your photo"): the card and the dialog show the
  same editor. The avatar of another person is never an edit control.
  `ProviderPhotoButtons` adds "Use my <provider> photo" for each identity whose provider gave a
  photo (`hasPicture` of `listSignInMethods`): `importAvatar` downloads it on the server. A photo
  that the user has goes only after a confirmation. The button shows its states (a spinner, then a
  check) in one icon box, the editor shows the result or the refusal under the buttons
  (`showsOwnError`), and a new photo cross-fades with the old one (`IdentityAvatar`). The server
  imports this photo one time at the sign-up with a provider.

- **The section `tokens` of the account page is the personal tokens.** `PersonalTokenService` needs
  no right: it is the account of the session. A token acts as its user. The server can turn them
  off (`enabled`), and a workspace can refuse them (`refusedWorkspaceIds`); the section shows a
  warning for the server, or for the workspace of the page only. The form and the labels are shared
  with the apps (`TokenForm`, `shared/presentation/presenters/token-labels.presenter.ts`).

- **`user` is system-wide, not org-scoped.** It is the directory of every account in the
  installation — hence the `system` sidebar section. Do not filter it by the current
  workspace; "who is in this org" is [`membership`](../membership/AGENTS.md)'s question.
  The user permissions are SYSTEM level: `can(Permission.X)` needs no target.
- **The own account has its own page.** `account` calls the RPCs on the own id, which need no
  grant. `users/:userId` sends the own id to the `account` of the active workspace, else to
  `/account`, and the directory opens `account` for the own row. The old path `users/me`
  redirects there too.
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
  cannot do.** Save, reset link, sign out one session, sign out everywhere, deactivate and
  reactivate: `UPDATE_USER`. The Sessions section shows with `READ_USER` (the page needs it).
  The email is editable only with `CREATE_USER` too (the proto rule). Delete: `DELETE_USER`.
  The own account page never sends an email.
- **A FAILED_PRECONDITION that a page shows beside a field is data, not an error.**
  `changePassword` and `deleteAccount` return the server message through `refusalOf`
  (`@shared/utils/scylla-error.ts`): `null` on success. The global handler would toast it a
  second time. `deleteAccount` signs out in its own `onSuccess`, not in the caller's: TanStack
  skips the callbacks of a `mutate` call when the component is gone. `remove` drops the queries
  of the deleted user (`removeQueries`), it does not only refresh them. On the page of another user, a FAILED_PRECONDITION goes to the global toast, as
  the server wrote it.
- **An account made with a provider has no password** (`hasPassword` of
  `myIdentityQueries.signInMethods`). The Password card then sets a first password, with no
  current password, as the server allows. `changePassword` refreshes the ways to sign in, so the
  next change asks for the current password.
- **Every form checks its values in the app** (`@shared/utils/account-validation.ts`): email
  format, password 8 to 255 characters and not spaces only, confirmation equal to the new
  password, username with no '@' and 255 bytes at most, display name 100 characters at most. Every form with a
  new password has a confirmation field. Every field has its `autocomplete` value.
- **Appearance is the only theme control of the app.** `ThemePicker` (Light, Dark, System)
  calls `setThemePreference` of `@scylla/ui/stores` with the center of the chosen thumbnail, so
  the new theme spreads from there. The picker has no RPC and no query: `localStorage` is the read
  copy, and `shell/presentation/layout/user-preferences.ts` sends the choice to the server
  (`platform/user-state`). The thumbnails use fixed colors (`theme-preview.ts`), copied from
  the tokens of `@scylla/ui/styles.css`: keep them in step.
- Passwords are write-only: no read returns one. Never log, store or display one.
- **Sessions.** Both pages show the list in the Sessions section, then "Sign out everywhere
  else" (own page) or "Sign out everywhere" (another user). The current session has the badge
  "This session" and no sign-out button. `revokeSession` takes `{ userId, sessionId }`. It
  finds the session in the cache of `sessions`: when it is the current session, it signs out
  in its own `onSuccess` (the page can be gone), else it refreshes the list. `revokeSessions`
  and `setActive` refresh the list too (a deactivation signs the user out). `remove` drops it.
- **`parseUserAgent` is the only place that reads a user agent.** Keep it pure and tested. The
  order of its rules is important: Edge, Opera and Samsung Internet also send `Chrome/`; iOS
  sends `Mac OS X`; Android and ChromeOS send `Linux`. A user agent with no known browser is an
  API client (`kind: 'api'`), named from its product token. Only a phone is `mobile`: a tablet
  is `desktop`. An empty user agent is `unknown` and has no name: the row shows "Unknown device"
  with a neutral icon (`circle-help`) and no "API client" prefix. The texts of a
  row are in `presenters/session-row.presenter.ts`. The title is "<browser> on <system>", or the name of
  an API client alone. The detail line of a named API client starts with "API client". "Active
  now" shows for less than five minutes, because the server moves the last activity at most
  once every five minutes.
- **The account page shows one section of the settings at a time.** The header (avatar, name,
  email, badges) stays on each page. In a workspace, the links are in the second sidebar of the
  shell. With no workspace there is no sidebar, so the page shows `AccountNav`, with links to
  `/account/<section>`. To add a section, add it to `ACCOUNT_SECTIONS` and to the branches of
  `Account.page.svelte`. A form in a
  `SettingsSection` with `actionBar` shows its `data-slot="form-actions"` as a bar at the bottom of
  the card.
- **The section `privacy` is the data of the account.** "Your data" exports it with
  `ExportAccountData`: one synchronous call, then the file goes to the browser
  (`scylla-account-data-<day>.json`). The panel has 4 states: `none`, `preparing`, `ready` (Download
  saves the same copy again, New export asks for a new one) and `failed`. The copy is the data of a
  mutation, never of a query: the cache does not keep it after the page. The links go to the public
  pages `/legal/privacy` and `/legal/cookies`, and to `danger-zone` (relative: the page is
  `account/privacy`). The card "Terms" shows the last version of the terms that the user
  accepted, and its date: `loginQueries.terms` of `features/login` (`GetMe`), and nothing before a
  first acceptance. The card of the cookies opens the cookie settings of `@platform/consent` while
  one tracker needs consent (source `account`). To add a subject, add a card to
  `AccountPrivacy.svelte`. `DeleteAccountDialog` lists what the deletion removes and what stays:
  keep these facts equal to `delete_user` of the core, and its link "Download my data first"
  (`privacy`, relative) closes the dialog. `AccountDeletion` gives the same dialog to the terms
  step, with `withExportLink={false}`: the auth guard shows no route there.
- **The section `about` shows the versions** that a user gives in a report of a problem. The
  edition and the version of the server come from `GetCapabilities` (`appQueries.server` of
  `apps`). The version of the web app is `import.meta.env.SCYLLA_WEB_VERSION`, that
  `tooling/vite.ts` writes at the build in the format of the server. A value that is not known
  shows "–".
- `getAll()` is paginated (`UserList`). Use `createPagination()` + `DataTable`; do not render
  an unpaginated directory.
- Users are principals in the authz model: deleting one removes their grants. Confirm through
  `ConfirmOperationAlertDialog`.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
