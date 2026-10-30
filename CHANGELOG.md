# Changelog

All notable changes to Scylla Web are in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before 1.0.0, a new minor
version (0.6.0) can change what an extension imports; a patch version (0.5.1) only fixes bugs.
An entry marked **Breaking** changes what a host repo or an extension imports
(`@scylla/ui/*`, `@scylla/core-sdk`, `@scylla/base-sdk`).

## [Unreleased]

### Added

- The scripting tab of the pipeline editor shows the nodes one by one: a list of the nodes by
  stage, the script of a node as shell code (with no JSON escapes), and its properties. Two nodes
  can be open side by side. The full JSON document stays available, to copy and paste.
- `copyToClipboard` in `@scylla/ui/utils`: writes a text to the clipboard, then shows a toast with
  the result. It takes the texts of its toasts, and tells whether it copied.

### Changed

- **Breaking:** `UserAccess` from `@scylla/base-sdk` is a union on `scope`. A system grant has
  no `organizationId` or `organizationName`, and only a project grant has `projectId` and
  `projectName`. Check `scope` before you read these names.
- **Breaking:** Code that touches an element is an attachment (`{@attach}`), not a Svelte
  action. `renderCodeMirror` from `@scylla/ui` takes its options as a getter:
  `{@attach renderCodeMirror(() => ({ doc, extensions }))}`.
- **Breaking:** A widget zone opens with the `WidgetZone` component of `@scylla/core-sdk`, not an
  attachment: `<WidgetZone point={loginPoints.footer} context={{ isPending }} />`. The injected
  components render in the owner's tree, so they read its Svelte context. A `replace` does not
  mount the owner's content. A widget injection does not change.
- A repository calls its gRPC client directly. The data source layer between them is removed.
- A mapper exports functions, not a class with static methods. A repository imports the mapper as
  a namespace: `grpcUser.toDomain(user)`, not `GrpcUserMapper.toDomain(user)`. No mapper is part of
  a public API, so no extension changes.
- **Breaking:** The node of a pipeline is `PipelineNodeEntity` in `@scylla/base-sdk` (it was
  `PipelineStep`). The pipeline editor says node everywhere, as the protos, the jobs and the
  dashboard do.
- Each module sorts its presentation by role, as `pipeline` does: `messages/`, `presenters/`
  (domain data → what a view shows), `mappers/` (a view format ↔ the domain), and `ui/` for the
  Svelte code. The rules of the backend move to the domain: the permission catalog of `roles`,
  the escalation rule (`holdsFullControl`, `holdsPermission` on the effective permissions of
  `@platform/authz`), the eligibility of a grant, the 5-field rule of a cron expression. Each rune
  file names its role (`.state`, `.effect`, `.adapter`, `.attachments`), and the test harness is
  `test/render.ts`.
- The domain of each module sorts its types by concept: the file of an entity holds every type
  that exists only with it (its parts, its inputs, its wrappers), and a struct file holds only a
  concept with no identity that stands alone. The transitions of the onboarding status move to
  the domain.
- **Breaking:** The extension that the app runs is `InstalledExtensionEntity` in
  `@scylla/base-sdk` (it was `InstalledExtension`).
- The pipeline editor does not save a pipeline that the server refuses: a name with spaces, a
  node id that the server does not accept, or two nodes with the same id. Save is disabled, and
  the header says why. The blueprint shows two nodes with the same id in red and does not
  change them; it no longer renames one of them without a word.
- The account page has a settings nav on the left and one page for each entry: Profile,
  Appearance, Security (password and sessions), Organizations and Danger zone
  (`account/<section>`). A short header above the nav shows the avatar, the name, the email and
  the badges. `account` opens the profile. On a phone, the nav is a row above the page.
- **Breaking:** `ScyllaResult` is removed from `@scylla/base-sdk`. A repository returns
  `Promise<T>` and rejects with a `ScyllaError`; a query returns the call
  (`queryFn: () => repository().list(id)`), with no `.unwrap()`. `grpcTransport` makes every
  failed call into a `ScyllaError`, so a repository only awaits its call. A `ScyllaError` takes
  its code as an option (`new ScyllaError(message, { code })`) and gives it as `code` (it was
  `getCode()`). `ScyllaError.from(error)` reads any thrown value. `refusalOf` takes the call:
  `refusalOf(repository().resetPassword(token, password))`. The entry point of scylla-base is
  `@scylla/base/scylla-error` (it was `@scylla/base/scylla-result`).

- **Breaking:** The domain types of `@scylla/base-sdk` take the name of their concept. In
  `authz`: `Principal` (it was `PrincipalEntity`), `Access` (`AccessEntity`),
  `EffectivePermissions` (`EffectivePermissionsEntity`) and `EffectiveScope`
  (`EffectiveScopeEntity`). `RoleKind` comes from `roles`, not from `authz`. In `roles`:
  `GrantableRole` (it was `GrantableRoleEntity`, and its `roleId` is `id`) and `CreateRoleInput`
  (`RoleCreationData`). In `apps`: `SecretLabelIssue` and `secretLabelIssue` (they were
  `SecretLabelProblem` and `secretLabelProblem`).
- **Breaking:** The id of a user is `id`, not `userId`: on `UserEntity`, `UserSummary` and
  `UpdateUserInput`. The id of a session is `id`, not `sessionId`.
- **Breaking:** `ProjectList` is a `PaginatedList<ProjectEntity>`: its projects are in `items`,
  not in `projects`.
- **Breaking:** `TriggerKind` is a union of literals (`'cron' | 'webhook' | 'unknown'`), not an
  enum. `UserAccessScope` and `AppAccessScope` are replaced by `AccessScope` of `authz`.
- **Breaking:** `MarketItem.descrption` is `MarketItem.description`.
- `JobEntity.status` and the status of a job of an agent are a `JobStatus`, not a `string`. A
  status that this build does not know is `unknown`.
- The domain rules of `AGENTS.md` say where a type goes when it is not clear: an input, a
  projection, a snapshot of the server, a reference, and a vocabulary that two features share.

### Removed

- **Breaking:** `roleQueries.vocabulary` and `PermissionVocabulary`. No screen used them: the role
  editor reads the permission catalog, and `permissionLevel` gives the scope of a permission.

### Fixed

- A refused copy of the id of an app shows an error toast; before, the error was not handled.
- The form of a trigger no longer writes debug lines to the console.
- The pipeline editor no longer freezes on a loop of dependencies. The blueprint refuses a link
  that closes a loop.
- A query that the server refuses (`NOT_FOUND`, `PERMISSION_DENIED`, `INVALID_ARGUMENT`…) is not
  sent again three times: the page shows the error, or leaves a deleted resource, at once instead
  of after about 7 seconds. Only a network failure or a busy server is retried.
- A network failure is "Server unreachable" in every browser. In Safari, it was a server error
  with the text "Load failed".
- The error toast no longer shows the text of a server fault (`INTERNAL`) or of a bug in the
  page: it says "An unexpected error occurred". An error that is not a `ScyllaError` now shows
  this toast too; before, it showed nothing.

## [0.5.0] - 2026-10-12

### Added

- Account pages, with a password reset.
- The sessions and an identity card on the user pages.
- New agents pages. The access of an agent and the names of its secrets are configurable.
- Extension points on the members page, and a return path after the login.

### Changed

- **Breaking:** `@scylla/ui/shadcn` is now `@scylla/ui/primitives`, with one folder for each
  primitive.
- Each component is in a folder with its companions. Deep imports use the aliases.
- `CLAUDE.md` is now `AGENTS.md`. `CONTRIBUTING.md` explains how to contribute.
- The CI fails when a commit names an AI agent as its author or co-author.
- The protos pin is the one of Scylla 0.5.0.

### Removed

- The invitation permission.

### Fixed

- The JSON linting and the colors of the pipeline script editor.
- Menus take the focus when they open. The tooltip arrow is at the correct position. The
  sidebar collapses smoothly.
- The scroll content and the focus rings stay inside their containers.
- The user texts have no em dashes.
- Users with the manage role can see the extensions page.
- The tab title shows the version of the app. It said 0.4: the title now comes from the
  version of `apps/web/package.json`.

[Unreleased]: https://github.com/scylla-ops/scylla-web/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/scylla-ops/scylla-web/releases/tag/v0.5.0
