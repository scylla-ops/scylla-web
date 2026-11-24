# Changelog

All notable changes to Scylla Web are in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before 1.0.0, a new minor
version (0.6.0) can change what an extension imports; a patch version (0.5.1) only fixes bugs.
An entry marked **Breaking** changes what a host repo or an extension imports
(`@scylla/ui/*`, `@scylla/core-sdk`, `@scylla/base-sdk`).

## [Unreleased]

## [0.7.1] - 2026-11-24

### Added

- Agent labels. The agent page has a Labels card, where the admins of the workspace add and
  remove labels, the agent list has a Labels column, the pipeline editor has an "Agent labels"
  button, and the job page shows the labels of the job and why a job waits for an agent. In
  English and French.

### Changed

- The checks of a pull request run in Scylla, on a Scylla agent (`.scylla/pipelines/ci.yaml`), not
  in GitHub Actions.

### Fixed

- The Secrets page shows a clear empty state. The Library search and tab texts say "workspace". The
  GitLab self-managed choice no longer wraps. The tour prompt shows the same step count as Help.
- Pipeline names are links to the jobs. List headers line up with their columns. Job IDs show the
  end of the ID. Long workspace lists in Admin users end with an ellipsis.
- Dashboard shows "Times in UTC" once, the trigger form text uses "local time", the mobile dashboard
  name ends with an ellipsis, and the job and fragment graphs are easier to read.
- The pipeline editor is usable on a phone and a tablet. In a narrow blueprint, the side panel goes
  under the canvas, the pipeline name has its own row, and the canvas toolbar shows icons only. The
  breadcrumb of the current page no longer goes under the menu icon.
- Show one "Service unavailable" banner, and reload the page when the API answers again, when the
  server is in maintenance or down.
- Breadcrumbs of agents, apps and fragments show their name, and the pipeline crumb has no hash. The
  unknown page of a workspace keeps the shell. The account header hides an empty username badge. The
  user menu opens What's new again.
- The cookie page lists the key of the width of the side panel of the pipeline editor. Tables of
  legal pages wrap long text, and the table of contents marks no section at the top of the page.
- The delete account dialog no longer asks for a password when the account has none.

## [0.7.0] - 2026-11-24

The web app of the new backend. A host repo or an extension must read the **Breaking** entries of
Changed.

### Added

**Pipelines**

- Conditional nodes in the pipeline editor: the If, Switch and Merge nodes choose the next nodes
  from a value or from the output of a node, and the error port of a node takes its failure.
- The library of a workspace. A box selection of nodes, or one node from its inspector, is saved to
  the library with a name, tags and parameters, and becomes one linked block. The Select button of
  the blueprint toolbar makes a drag draw a selection box, as Shift does. The Library tab of the
  palette inserts a fragment on a link or in empty space. A block links a version: a new version is
  proposed, never forced, and a block can be detached as an editable copy. The Library page has a
  search, the tags and the favorites, and the page of a fragment shows its nodes, parameters,
  versions and usages.
- The marketplace, on `MarketplaceService` of the marketplace that Scylla hosts
  (`VITE_MARKETPLACE_API_URL`, else `VITE_API_URL`). The Marketplace page lists the fragments that
  teams share, with a search, a sort and filters on the publisher, the category and the stack. The
  page of a package shows its steps, parameters, versions and what it needs. A package is added to
  the library linked, to get the new versions of its publisher, or as a fork that the workspace
  owns. A fragment of the workspace goes public as `@workspace/name` after checks on its secrets,
  descriptions, private addresses and references to the workspace. The marketplace shows the stars
  of the packages.
- The places of the nodes are part of the pipeline: all members see the same canvas, and a place
  stays after a reload. A saved node saves its place at the end of a drag.
- The pipeline editor exports a saved pipeline as a TOML, YAML or JSON file for the repository, to
  copy or to download. It asks before you leave with unsaved changes, and an icon shows the state of
  the save.

**GitHub and GitLab**

- The settings of a workspace have an Integrations page: an admin connects GitHub (with the Scylla
  GitHub App) or GitLab.com (with the token of a service account), and sees the state, the event
  mode and the token expiry of each connection. The administration has a Git providers page: an
  instance admin creates the GitHub App of a self-hosted server with the GitHub manifest flow.
- A project has a repository page: link a repository, see how Scylla gets the new commits, send a
  test webhook, turn the reports on or off, take the pipelines from the files of the repository,
  and block the merge of a pull request until a pipeline passes. A new project can be linked to a
  GitHub repository at its creation.
- A pipeline from a file of the repository has a read-only page: the graph, the text of the file,
  its triggers, its checkout and its errors, at a branch or a tag. With a linked repository, Run
  asks for a branch, a tag or a commit SHA, and the jobs can be filtered by branch, event, author
  and pull request.
- The trigger editor has the Push, Pull request (Merge request on GitLab) and Tag triggers, and the
  conditions of a webhook on a header or on a field of the body. A delivery that does not match
  shows as Skipped, with the reason.
- The page of a job shows its commit, the checkout as its first step, the errors of an invalid
  pipeline file, and the reports to GitHub or GitLab with Retry now. An editor approves or rejects a
  run from a fork, which gets no secrets. The jobs table has a Source column.
- `docs/git-providers.md` tells how to set up GitHub and GitLab for a server.

**Machines**

- The agents and the apps are under Machines. "Add an agent" is a page (`/agents/new`) with three
  steps: the name and the access, the install, and the connection. The install has a tab for
  Linux, macOS, Windows and Docker, and each command names the server.
- The page of an agent shows its machine (the versions, the container runtime, the features and the
  missing features), the update and the uninstall commands, and a timeline of its jobs since it
  joined (7 d, 30 d, 90 d or all). An agent shows "Update needed" or "Incompatible" from its agent
  protocol.
- A new app takes a token, a CI identity or a key pair. The list of the apps shows the credentials,
  the access and the last use of each app, and the page of an app manages its credentials and shows
  its stats.
- A run warns when the job needs a container and no connected agent has a container runtime. A job
  that waits for an agent with checkout names the online agents that cannot get its code.

**Workspaces, members and roles**

- The Access group of the sidebar: the members and the roles of a workspace, the access of a
  member, the holders of a role, and the apps of the members. Workspace owner is a built-in role,
  and the last owner stays. A member and a holder show if they are a person, an agent or another
  app.
- The New role page has one tab for each level of the role, a box that selects or clears a tab, a
  row or a column, and "Copy from a role" with Undo. The editor of a role changes its level while
  the role has no holder. In the roles list, the Holders cell opens a card with the holders.
- Invitations to a workspace by email, accepted or declined in the inbox.
- The General page of the workspace settings has a time zone field.
- The administration of the server is at `/admin`: the users and their instance roles, the limit of
  the workspaces, the Git providers, and the legal settings.

**Notifications and search**

- An inbox: the bell of the top bar has a badge and a short popover, and the page `notifications`
  has its views in the second sidebar, a selection, pages and keys. It shows the failed runs and the
  notices of the Git connections, and it is also on the first-workspace screen and on the personal
  pages.
- The search of the top bar is a command bar (Ctrl K or Cmd K). It finds pages, tabs, projects,
  pipelines, agents, apps, people, roles and secrets, also with a typing error, a QWERTY or an
  AZERTY keyboard and no accents. It changes the theme and the language, opens the inbox, opens a
  form and runs a pipeline. It never deletes, and a run asks for a confirmation.
- A menu with a long list takes text: the member to add, a project, a secret, a dependency of a
  node and the roles. The search reads the name, the handle, the email and the description.

**Accounts, legal and privacy**

- The sign-in on `AccountService`, with a session cookie and its refresh, the page of a failed
  sign-in, the link of a provider with the password of the account, and the mark of each provider.
  After a sign-in, the mark of the sign-in page flies onto the logo of the dashboard.
- The theme, the language, the node style, the last workspace, the seen flags and the tour follow
  the person to a new device. `localStorage` stays the read copy, and the app works when the server
  does not answer (`platform/user-state`).
- The account page has the change of an email, the linked identities, the personal tokens (with a
  switch on the instance and on each workspace), an About section with the edition and the versions
  of the web app and of the server, and a Privacy section with the download of the data of the
  account.
- The legal pages `/legal/<kind>`, with their links under the sign-in pages and in the user menu,
  and the page "Legal and privacy" where the instance admins set them, with "What changes" for a new
  version of the terms.
- The acceptance of the terms of service: a box on the sign-up form, and a full-page step that asks
  each user to accept a new version, with "Decline and delete my account".
- A registry of each cookie and each storage key, shown on the cookie page, and a consent framework
  (a banner and the cookie settings) that stays hidden while each tracker is exempt. Global Privacy
  Control is a refusal.

**The look and the frame**

- The look of the design: a double sidebar (a rail of the sections and a second sidebar of their
  pages, with a width from 140 px to 400 px), the switch of workspace and the bell at the right end
  of the top bar, the logo above the sidebars, new colors (a darker dark theme), the fonts Funnel
  Sans, Funnel Display and JetBrains Mono, compact buttons and fields, and a skeleton for each
  loading state. Agents, apps and personal tokens show as cards on a phone.
- A page that fails to load or to render shows an error in its place, with "Try again", and the
  rest of the app keeps working. A write that the server refused because the item changed in the
  meantime is shown as such, and the page reloads what the server has.
- For the developers: `pnpm test:file`, `pnpm test:name`, `pnpm test:dir` and `pnpm test:changed`
  run a part of the tests; end-to-end tests with Playwright against a real CE server; Dependabot for
  npm and GitHub Actions; `pnpm tokens:export` writes the design tokens for Figma; `pnpm ui:catalog`
  opens a visual catalog of `@scylla/ui` (Storybook); `gen-proto` takes the files of each proto
  root, so a host root adds or hides a file.
- For the extensions: `ScyllaModule.commands` and `NavLink.keywords` for the command bar,
  `notifications.kinds` for the view of a notification, `NavLink.heading`, `NavLink.params`,
  `NavLink.danger` and `NavSectionDefinition.noRailItem` for the sidebar,
  `ShellContributions.secondSidebarLinks` and `ShellContributions.bottomInset`, the `Identity`
  component and the `chip` snippet of `SearchSelect`, `Popover` in `@scylla/ui/primitives`, and the
  `overlay` token.

### Changed

- **Breaking:** the app runs on the API of the new backend. The protos come from the submodule
  `protos` (`scylla-protos`), and the code and each text say workspace, not organization.
- **Breaking:** `NavSectionDefinition` of `@scylla/core-sdk` has no `header`. Use `railItem` or
  `within` to place a section in the rail, and the new `brand` and `topBarEnd` of
  `ShellContributions` for the logo and a switcher.
- **Breaking:** `ScyllaErrorCode` of `@scylla/base-sdk` has two more members:
  `MALFORMED_RESPONSE` (the server answered without the entity it must carry) and
  `UNSUPPORTED_RESPONSE` (it answered with a value this build cannot read). A map over every code
  must list them. `required` of the shared gRPC wrappers gives the first.
- The server holds the build of this app in its binary and serves it on its one port. The build
  must have no `VITE_API_URL`, so the app calls the origin that serves it. Vite on a second port is
  for development only.
- The "What's new" dialog announces 0.7.0: the conditional nodes, the library, the marketplace, the
  command bar, the inbox, Machines, GitHub and GitLab, and the new look. The packages have the
  version 0.7.0.
- A workspace opens on its dashboard, not on the list of projects. The second sidebar of the
  projects shows each project of the workspace.
- The sign-in, the sign-up, the password reset and the other public pages have no card: a panel
  shows the Scylla mark, and the content is on the axis of a centered column.
- The dialog that changes the roles of a member is a checklist: each role shows its description, or
  why it is locked, and each change applies at once.
- The list of the pipelines shows up to 30 jobs of each pipeline as bars, and the height of a bar
  shows the duration of its job. A hover on the name of a pipeline shows its pass rate, its median
  duration and its failures.
- The filters of the lists use one segmented control. The roles lists show the level and the type
  of each role beside its name, and the resources of the role on one line.
- All the actions that delete, remove, revoke, disable or deactivate are red, and in a menu they
  come last, after a separator. A radio, a checkbox or an icon in a card is centered vertically on
  the whole card.
- Buttons no longer zoom on hover: a hover only changes the color.
- The language is in the user menu, the crumbs name the section, and the header of a list shows its
  count with no "in total".
- The libraries of the front are at their latest versions: Vite 8 (Rolldown), Lingui 6, ESLint 10,
  Babel 8, and the new minor versions of Svelte, bits-ui, TanStack and CodeMirror.

### Fixed

- A full lint no longer reloads the TypeScript server each time it passes from a `.ts` file to a
  `.svelte.ts` file. It takes 30 s in place of 4 minutes, also in a host repo that uses
  `tooling/eslint.js`.
- A change from another tab or from another person shows when the tab shows again and when the
  browser is online again. Before, it showed only after a navigation or a reload.
- A failed refetch no longer removes the editor of a pipeline, the editor of a role or the account
  page with what the user typed.
- A URL with no page shows "Page not found" and a link to the app. Before, it went to the sign-in
  page, so a signed-in user looked signed out.
- The guided tours: the ring stays on its target and follows a scroller, the card does not cover
  the target, an open menu or a field to fill, and a tour does not rewind while a page loads.
- The blueprint of the pipeline editor opens on a still canvas, with the nodes in the middle.
  Before, they showed on the left, and the view moved and zoomed while it centered on them.
- The connection point of a node shows when the pointer is near it, and only a pull makes a link.
- A job tells why it failed and why a node failed or was skipped, names its agent, and says when no
  log was written. A finished job is no longer called live. A long line of a job log wraps in the
  log panel, and the panel shows an error when the log stream fails.
- A new name of a project shows at once in the crumb, the sidebar and the search. The breadcrumb
  stays on one line, and only the id of the current page gets shorter.
- The first click after a dialog, an alert dialog or a sheet closes works. Before, the page did not
  take the pointer until the close animation ended.
- With reduced motion on, menus, dialogs and the phone sidebar no longer animate.
- The colors of the app follow the theme, also in the dark theme: the cards of the triggers and the
  secrets, the menu buttons of the rows, the access denied page, and the text of the destructive
  buttons and badges.
- The texts agree with a count ("1 job", "1 project"), and the days to an expiry are rounded.
- Dates, times, relative times, numbers, percents, sizes and durations use the language of the UI,
  also after a change of the language: "il y a 33 min", "0,7 par jour", "89 %", "24 Go" in French.
  The French texts say "la pipeline" and "Bibliothèque", use one word for a run, and have a
  no-break space before a colon.

### Security

- The sign-out removes the local data of the account: the workspace, the command history, the
  dashboards, the onboarding, the seen flags and the sync state. The theme and the language stay.

## [0.6.0] - 2026-11-01

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
- The "What's new" dialog announces 0.6.0: the scripting by node, the drag and drop on the
  blueprint, the safer pipeline saves, the role and trigger pages, the account page and the tables
  on a phone. The "New" badge is on the Roles link.

### Removed

- **Breaking:** `roleQueries.vocabulary` and `PermissionVocabulary`. No screen used them: the role
  editor reads the permission catalog, and `permissionLevel` gives the scope of a permission.

### Fixed

- A refused copy of the id of an app shows an error toast; before, the error was not handled.
- The form of a trigger no longer writes debug lines to the console.
- The pipeline editor no longer freezes on a loop of dependencies. The blueprint refuses a link
  that closes a loop.
- The blueprint of the pipeline editor keeps the cursor of the system: an arrow on the canvas, a
  pointer on a node. Before, it was a white hand that did not show on the light canvas.
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

[Unreleased]: https://github.com/scylla-ops/scylla-web/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/scylla-ops/scylla-web/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/scylla-ops/scylla-web/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/scylla-ops/scylla-web/releases/tag/v0.5.0
