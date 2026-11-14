# Changelog

All notable changes to Scylla Web are in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before 1.0.0, a new minor
version (0.6.0) can change what an extension imports; a patch version (0.5.1) only fixes bugs.
An entry marked **Breaking** changes what a host repo or an extension imports
(`@scylla/ui/*`, `@scylla/core-sdk`, `@scylla/base-sdk`).

## [Unreleased]

### Added

**The port to the new backend**

- The sign-in uses `AccountService`, with a session cookie and its refresh. The errors of the server
  have typed details.
- The page of a failed sign-in, with a card for each code, and the page that links a provider with
  the password of the account.
- The sign-in buttons and the linked identities show the mark of the provider.
- Invitations to a workspace by email.
- The account page has the change of an email, the linked identities and the instance admins.
- The secrets of a project, the pipelines, the jobs, the triggers and the apps run on the new
  services. The dashboard and the onboarding tour are back.
- End-to-end tests with Playwright, against a real CE server. Dependabot for npm and GitHub Actions.

**The state of a person on the server**

- The theme, the language, the node style, the last workspace, the seen flags of the release and
  the tour follow the person to a new device. A new device does not show again a dialog that the
  person closed. `localStorage` stays the read copy, and the app works when the server does not
  answer. See `platform/user-state`.
- The places of the nodes are part of the pipeline: all members see the same canvas, and a place
  stays after a reload. A saved node saves its place at the end of a drag, with no Save button. A
  new node sends its place with the next save of the pipeline.

**Notifications**

- A real inbox: the bell has a badge and a short popover, with no filter. The page `notifications`
  has its views in the second sidebar, a selection, pages and keys. Both exist in English and in
  French.
- An invitation can be accepted or declined in its row, with no mail link.
- The bell is also on the first-workspace screen and on the personal pages, so a user with no
  workspace sees an invitation.
- The failed runs are a view of the page, for a caller who can list the jobs. The false text
  "All is well" is gone.
- The command bar opens the inbox and marks all notifications as read, after a confirmation.
- An extension adds the view of a kind with `notifications.kinds`.
- `@scylla/ui/primitives` has `Popover`, `PopoverTrigger` and `PopoverContent`.
- `NavLink.heading` of `@scylla/core-sdk` puts a title above a link of the second sidebar.

**Members and roles**

- The Access group of the sidebar, and the Instance section.
- The members and the roles of a workspace, the access of a member, the last owner, and the apps of
  the members.
- The pages of the roles, and the instance roles on the page of the users.
- The editor of a role changes its level while the role has no holder.
- The limit of the workspaces on the settings page of the instance.

**Search in the menus**

- A menu with a long list now takes text: the member to add, the project of a role, the scope of a
  member, a secret, a dependency of a node, the role that takes the holders, the role picker and
  the role to start from. The search reads the name, the handle, the email and the description.
  Case and accents do not count.
- The people field of "Add members" shows the directory on a click, and works with the keyboard. A
  long list shows 50 rows and says how many more rows there are.
- A filter field in the workspace switcher from 6 workspaces, and in the lists of projects of an
  agent, an app and a token from 8 projects.

**Machines**

- The agents and the apps fold under Machines in the sidebar.
- A new list of the agents and a new agent page, with empty, no-access and no-key states. A new
  agent takes three steps, and the install command says what it needs.
- A new app takes a token, a CI identity or a key pair. The list of the apps shows its credentials,
  its access and its last use. The page of an app manages its credentials.
- The stats of an app, its API tokens and its CI identities. The dashboard draws the agent outcomes
  from the stats of the server.

**The search bar**

- The search of the top bar is a command bar. It finds pages, tabs, projects, pipelines, agents, apps,
  people, roles and secrets. It also changes the theme and the language, opens a form and runs a
  pipeline.
- The search accepts typing errors: swapped, missing, extra and wrong letters, with a QWERTY or an
  AZERTY keyboard, without accents, in English and French.
- Each row says what it does before the user selects it: the type, the place and a verb. The bar never
  deletes. A run and a sign-out ask for a confirmation, and a preference has an Undo.
- `ScyllaModule` of `@scylla/core-sdk` can declare `commands`, and `NavLink` can declare `keywords`.
  The ids of the commands must be unique.

**Personal tokens and phones**

- The personal tokens on the account page, with a switch on the instance and on each workspace.
- Agents, apps and personal tokens show as cards on a phone. The screens of an agent, of an app and
  of the account fit a phone.
- A skeleton for each loading state.

**The look of the design**

- `pnpm test:file`, `pnpm test:name`, `pnpm test:dir` and `pnpm test:changed` run a part of the tests
  with no coverage, so a developer does not wait for the whole suite. The tests also run on Node 25
  with no flag.
- A double sidebar: a rail of the sections, which opens on a click and does not move the page, and a
  second sidebar with the pages of the selected section. Inside a project, the second sidebar shows
  the pages of the project. On a phone, the sheet stays.
- The user can move the right edge of the second sidebar, with the pointer or the keyboard, from
  140 px to 400 px. The default is 200 px. A double click on the edge, or Enter, gives the default
  width again. A longer link is cut with an ellipsis, and its tooltip gives the full text. The page
  follows the edge. The browser keeps the width.
- The switch of workspace is at the right end of the top bar, after a search (Ctrl K or Cmd K) of
  the projects, the pipelines, the agents and the apps, and a bell with the last failed runs.
- The logo is at the center of the band above the sidebars. A click on it opens the dashboard of
  the current workspace.
- The look of the design: its colors (a darker dark theme, stronger lines, a darker green in the
  light theme), its fonts (Funnel Sans, Funnel Display, JetBrains Mono), compact buttons and fields
  of 32 px, cards with a smaller gap and no shadow, and rounder menus and dialogs.
- A write that the server refused because the item changed in the meantime is shown as such, in
  the words of the app, and the page reloads what the server has. Before, the user saw an
  unexpected error, and a query retried on it.
- A page that fails to load or to render shows an error in its place, with a "Try again" button.
  The sidebar, the top bar and the other pages keep working.
- `pnpm tokens:export` writes the design tokens of `styles.css` to `packages/ui/tokens/`, in the
  format that Figma imports. A CI step and a test fail when these files are not up to date.
  `packages/ui/DESIGN-SYSTEM.md` tells how the code and the Figma library stay the same.
- `pnpm ui:catalog` opens a visual catalog of `@scylla/ui` (Storybook): each component with its
  variants, sizes and states, in the light and the dark theme. A test fails when a component has no
  entry, and a CI step type-checks and builds the catalog. `packages/ui/DESIGN-SYSTEM.md` tells how
  to add an entry.
- The role editor names the permissions of the Git integration: Integrations (workspace), Repository
  (project) and Git providers (instance). The Project tab has an Approve column for "Approve fork
  runs", and its box tells on hover that a run from a fork never gets the secrets. A checkbox of the
  table is centered in its cell.
- The editor of a saved pipeline has an Export action: the pipeline as a TOML, YAML or JSON file for
  the repository, to copy or to download.
- The settings of a workspace have an Integrations page. An admin connects GitHub (with the Scylla
  GitHub App) or GitLab.com (with the token of a service account), and sees the state, the event
  mode and the token expiry of each connection.
- A pipeline that comes from a file of the linked repository has a read-only page: the graph, the
  text of the file, its triggers from `on`, its checkout and its errors, at the branch or the tag
  that the user picks. The list of the pipelines tells which file has errors on the default branch
  or left it. With a linked repository, Run asks for a branch, a tag or a commit SHA, and the jobs
  of a pipeline can be filtered by branch, event, author and pull request.
- The trigger editor has the types Push, Pull request (Merge request on GitLab) and Tag: the
  branches to include and to exclude, `[skip ci]`, the target branches, the events and the drafts of
  a pull request, the tag patterns, and the variables of a run. With no linked repository these
  types are off, with a link to link a repository. The list shows the rules of a Git trigger, and a
  trigger of a pipeline file is read only.
- The inbox shows the notices of the Git connections: a connection that needs attention, with its
  cause, and a GitLab token that expires soon. Each notice opens the integrations of the workspace.
- A project has a Settings page for its repository. An editor links a repository of a connection of
  the workspace, sees how Scylla gets the new commits (webhooks, or polling with the reason) and
  sends a test webhook, turns the reports on or off, picks a check run or a commit status on GitHub,
  and unlinks the repository. The unlink dialog lists what stops. The card tells why a link stopped
  and where to repair it.
- The repository page of a project has a Pipeline source card and a Block the merge card. An editor
  moves the pipelines from the Scylla editor to the files of the repository, or back. Before a move
  to the files, a dialog lists the files of the default branch and their errors. On GitHub each
  pipeline has a switch that blocks the merge into the default branch when it fails, and on GitLab
  the project has one switch. A switch shows the state on the provider. When a permission is
  missing, it gives the link to grant it and the steps to do it by hand.
- The instance pages have a Git providers page. An instance admin creates the GitHub App of a
  self-hosted server with the GitHub manifest flow, sees its webhook URL and its last webhook, and
  removes it. On a server with the App of the settings, the page shows that App with no change.
- The page of a job shows its commit: the repository, the branch or the tag, the SHA, the pull
  requests, the author, the event and the pipeline file. A job from a fork shows the fork and that
  it gets no secrets, and an editor can approve or reject it. The page shows the errors of an
  invalid pipeline file, the checkout as the first step with its log, and the reports to GitHub or
  GitLab with Retry now and Fix the connection. The jobs table has a Source column and the states
  Waiting for approval and Invalid pipeline file.
- `docs/git-providers.md` tells how to set up GitHub and GitLab for a server: the GitHub App by hand
  or with the manifest flow, its permissions, events and URLs, and the GitLab service account.

### Changed

**The public pages**

- The sign-in, the sign-up, the password reset, the sign-in errors, the link of a provider and the
  check of an email have no card. A panel shows the Scylla mark, and the logo, the title and the
  texts are on the axis of a centered column. The field labels stay on the left edge of the field.
  On a small screen, the panel is not shown.
- The page that accepts an invitation has the same frame.

**The install of an agent**

- The install step has a tab for Linux, macOS, Windows and Docker, each with its hint. Each command
  names the server. The Docker command has the image and the version of the server, starts again
  with the machine, and reaches a server on the same machine. A choice gives it the Docker socket
  for container steps, with a warning.
- The install step tells that a machine joined and did not connect yet. After one minute, it gives
  the command of the logs. The manual path links to the release of the version of the server.
- The page of an agent that never connected makes a join code only after a click, because a new code
  stops the previous code. It then checks the agent each 2 seconds.
- The page of an agent gives the update command when the agent and the server have different
  versions, and the uninstall command for the system of the agent.
- A run warns when the job needs a container and no connected agent has a container runtime.

- The dialog that changes the roles of a member is a checklist. Each role shows its description, or
  why it is locked, and each change applies at once. The dialog asks before the last workspace role
  of a person goes, and shows the roles of the other scopes with a link to the page that changes
  them.
- **Breaking:** the app runs on the API of the new backend. The protos come from the submodule
  `protos` (`scylla-protos`), and the code and each text say workspace, not organization.
- The server holds the build of this app in its binary and serves it on its one port. The build
  must have no `VITE_API_URL`, so the app calls the origin that serves it. Vite on a second port is
  for development only.
- **Breaking:** `MemberRow` of `@scylla/base-sdk` no longer has `isInstanceAdmin` and
  `fromInstanceOnly`, and the rows of `buildProjectMemberRows` no longer have `changeIn`.
- **Breaking:** `NavSectionDefinition` of `@scylla/core-sdk` has no `header`. Use `railItem` or
  `within` to place a section in the rail, and the new `brand` and `topBarEnd` of
  `ShellContributions` for the logo and a switcher.
- The language is in the user menu. The crumbs name the section, not the workspace.
- A page alone in its section declares a `NavGroup`: the group names the section, the link the page.
- The header of a list shows its count with no "in total".
- The Project roles column of the members table starts with a pill `All projects · <project role>`.
  The pill tells the access of each built-in workspace role on the projects, for example Project
  editor for a Workspace member.
- The sections of the account page are in the second sidebar, not in a menu of the page, and the
  avatar of the rail is green on this page. With no workspace there is no sidebar, so the page
  keeps its menu. `nav` of a route can be a list of links, with `NavLink.params` and
  `NavLink.danger`, and `NavSectionDefinition` has `noRailItem`.
- **Breaking:** Workspace owner is a built-in role. The Owners card is gone. The Change roles dialog
  shows the role as a row, and the remove button needs `MANAGE_OWNERS`. Remove from the workspace
  also takes the role. An invitation does not carry it, and the Add dialog says so. `ownerQueries`,
  `ownerMutations`, `WORKSPACE_OWNERS_QUERY_KEY` and `WorkspaceOwner` are gone from the workspace
  feature. `MANAGE_OWNERS` now reads the permission `manage_owners`. The API has no `AddOwner`,
  `RemoveOwner` and `ListOwners`.
- **Breaking:** `ScyllaErrorCode` of `@scylla/base-sdk` has two more members:
  `MALFORMED_RESPONSE` (the server answered without the entity it must carry) and
  `UNSUPPORTED_RESPONSE` (it answered with a value this build cannot read). A map over every
  code must list them. `required` of the shared gRPC wrappers gives the first.
- The filters of the agents, the users, the members and the roles, the CI provider, the life of a
  token and the switches of the pipeline editor use one segmented control. A thumb moves under the
  selected item, and a count rolls when it changes. The filter of the agents shows the color of each
  state. With a reduced motion setting, the thumb moves in 150 ms and the counts do not roll.
- The roles lists show a tile of the level and the type (Custom or Built-in) beside the name of each
  role. The Permissions column shows the resources of the role and their actions on one line, and a
  "+N" pill opens a card with the other resources. A click on the Role header sorts the roles by
  name. The Level and Type columns are removed.
- The libraries of the front are at their latest versions: Vite 8 (Rolldown), Lingui 6, ESLint 10,
  Babel 8 and the new minor versions of Svelte, bits-ui, TanStack and CodeMirror.
- "Add an agent" is a page (`/agents/new`), not a dialog: name and access, install, connected. The
  projects are two cards and a list in one step. The Windows install has an "i" card that shows its
  two ways apart. A reload goes back to the install step of the agent (`/agents/<id>/connect`). A
  user who leaves before a machine joins chooses to stay, keep the agent or delete it. The list
  shows "Finish setup" for an agent that never connected.

### Removed

- The Reports card of a GitHub repository has no choice between a check run and a commit status.
  Scylla reports to GitHub only with a check run.

### Fixed

- A full lint no longer reloads the TypeScript server each time it passes from a `.ts` file to a
  `.svelte.ts` file. It takes 30 s in place of 4 minutes, also in a host repo that uses
  `tooling/eslint.js`.
- The guided tours. Only Skip leaves a step that lives in a dialog: Escape, a click outside, the
  close button and Cancel do nothing or do not show, and Tab reaches Skip. Skip on the welcome dialog
  asks for a confirmation.
- The ring of a tour stays on its target: it follows a scroller, stops at its edge, and has one
  hole when two targets overlap. The real button inside a larger spot takes the click.
- The card of a tour does not cover the target, an open menu or a field that the user must fill,
  when a free place exists. On a phone, the first step points at the menu button.
- A tour does not rewind while a page loads, and it does not show "on another page" on the page of
  the step. It stays the same in two tabs. A blank name no longer lets the user go on with Next.
- A reload on the step of the join command opens the page of the agent that the tour created, and
  the step does not offer Previous, which made a second agent.
- A step of a tour that adds members stays until the add succeeds. Below 1280 px, the steps of the
  pipeline actions tell the user to open the menu.
- A failed list of pipelines or of jobs shows its error once. Before, the page sent the call again
  about 40 times each second, with one error toast for each call, until the user left the page.
- A change from another tab or from another person shows when the tab shows again and when the
  browser is online again. Before, it showed only after a navigation or a reload, because the app
  never called `queryClient.mount()`.
- A query that keeps failing shows one error toast until it has a success, not one at each focus
  or poll. A `QueryErrorHandler` gets `repeated` for the next failures.
- A failed list of pipelines no longer stops the page with "This page could not be shown". The
  page shows the error in the table area, and a failed refetch keeps the rows.
- A failed refetch no longer removes the editor of a pipeline, the editor of a role and the account
  page with what the user typed. A focus does not replace a draft of a pipeline.
- On the sign-in page, the "or" line is at the same distance from the "Sign in" button and from the
  provider button. Before, the gap under the "Sign in" button was 24 px.
- A new name or address of a workspace shows at once in the switcher, the pages and the lists, and
  after a reload. A new address keeps the same page, the project and the pipeline. Before, the old
  name stayed, and a new address opened the first workspace.
- The workspace list shows the members, edit and delete actions on each workspace where the user
  has the permission, with no switch. Before, the actions showed only on the active workspace.
- The edit dialog of a workspace can change the name or the address alone. Before, Save stayed
  disabled until both fields had text.
- A sign-in with a provider, its "Try again" link and the link of a provider on the account page
  work when the app has the same origin as the API. Before, a click on these links did nothing.
- A URL with no page shows "Page not found" and a link to the app. Before, it went to the sign-in
  page with no check of the session, so a signed-in user looked signed out.
- A notification about an answer to an invitation opens the members of the workspace, and the page
  of your own user opens your account. Before, both went to the sign-in page.
- The dialog that changes the roles of a member shows each change at once, on the members of a
  workspace and of a project. A refusal does not stay for the next opening. On the page of a member,
  the dialog stays open when the last role goes.
- All titles use one font, Funnel Display, and one weight. All page titles have one size. Before,
  only the title of a list page used this font, and the page titles had four sizes.
- A job shows why it failed and why a node failed or was skipped, and names its agent. It says when
  no log was written, and no longer calls a finished job live. The start of a long last line stays
  in view.
- A folding group of the sidebar stays open when the page leaves it, and a tab of a page changes
  with no new mount.
- The days to an expiry are rounded, and the texts count one job or one project.
- The delete of an agent says "agent deleted", and the page no longer reads an app after its delete.
- An added member says that a member was added, and not the label of the button. The list of the
  invitations has its own permission check. The email hint shows only to a caller who cannot browse
  the users.
- French uses one word for a run and one text for Completed.
- A person who looks at the members of a workspace or of a project no longer sees the instance
  admins. A member with a role here shows only that role, with no sign of a role of the instance.
  Instance › Users still shows the instance admins.
- Buttons no longer zoom on hover. Before, a wide button grew by 27 px and its text became less
  sharp. Now a hover only changes the color. In the dark theme, a destructive button now also
  changes color on hover.
- With reduced motion on, menus, dialogs and the phone sidebar no longer animate.
- A restart or an outage of the server no longer signs out the open tabs. Before, a query sent
  during the outage ended the session on the server. Now the page stays, with one "Server
  unreachable" toast, and a first load shows a view that tries again by itself. Only the server
  ends a session. Two tabs that refresh the token at the same time go in turn, so that the server
  does not close the session.
- The blueprint of the pipeline editor opens with its nodes in the middle of the canvas. Before,
  they showed on the left. The view frames the nodes again when the canvas changes size, until
  the user moves the view.
- The log panel of a job shows an error when the log stream fails before its first line, and
  says under the lines when a live tail stops. It showed an empty or a frozen log, and wrote the
  failure in the console only.
- The icon and the title of the empty Agents and Apps pages have the same position. Before, a
  longer text moved them up.
- The lookups of projects read each project. They kept only the first 100, the oldest ones, so the
  dashboard, the menus and the top bar search did not show the newest projects of a large workspace.
- A new name of a project shows at once in the crumb, the sidebar title, the members page of the
  project and the top bar search, also after a reload. Before, the old name stayed until a click on
  the project card. A link to a project that does not come from its card, for example a direct link
  or a result of the search, shows the name of this project. Before, it showed the last open project.
- A project that is not on the first page of the list opens and shows its name. Before, the app went
  back to the list of projects. After a delete of the open project, the top bar search no longer
  shows this project and its pages, and a browser back to it goes to the list.
- Each icon of the closed rail shows its title in a tooltip on a hover and on a focus. The items of
  a menu, of a select and of the command bar show the pointer, as a button does.
- The open rail covers all the second sidebar, to the same edge as the logo band. Before, it kept a
  fixed width: after a resize, a part of a wider second sidebar stayed visible to its right, and a
  narrower one put the rail over the page.
- The double sidebar is darker than the page, in the light and in the dark theme. The rail is the
  darkest, then the second sidebar. The thumbnails of the theme picker show the same colors.
- A workspace opens on its dashboard, not on the list of projects: from `/`, after a change of
  workspace, after a project that is gone and from the not-found page. The second sidebar of the
  projects shows each project of the workspace after "All projects", apart from it. A module adds
  such links with `ShellContributions.secondSidebarLinks`.
- The page of an agent and the page of an app have a space under the last card. Before, the last
  card touched the bottom of the window, and a floating button at the bottom right covered it.
- The pages that scroll have a space under their last element: the lists of agents, apps, members,
  roles, users, secrets and triggers, the page of a role, of a user and of the access of a member,
  the settings, the account, the help and the notifications. Before, the last element touched the
  bottom of the window, and a floating button at the bottom right covered it.
- The logo band has one color, the color of the top bar, in the light and in the dark theme. Before,
  it had the colors of the two columns below it.
- The notifications panel opens at the size of its list. Before, it opened large and then became
  smaller when the list loaded. While the list loads, the panel shows one skeleton row for each
  unread notification, and its height changes smoothly.
- The tooltip of a row of the closed rail shows only while the pointer is on the row, or on a focus
  from the keyboard. Before, a row that the pointer crossed on the open rail showed its tooltip when
  the rail closed, and a row that the user clicked showed its tooltip again when the window got the
  focus back.
- The line on the right edge of the sidebar and the line below the band of the logo and the top bar
  are light again, in the light and in the dark theme. Before, they had the strong color of the
  inputs and looked thick.
- When the user opens another page from the rail, the green tile of the old row shrinks and fades
  out, and the tile of the new row grows in its row with a small bounce. Before, the tile jumped
  from one row to the other with no transition. With a reduced motion setting, the tile only fades.
  A page load shows the tile with no motion.
- The jobs chart of the agent page fills its card, with a scale, the dates and a mark for each day
  with no job. A timeline above the stats shows the jobs since the agent joined: drag its window, or
  use 7D, 30D, 90D or All, to choose the period of the stats and of the chart.
- The New role page shows one tab for each level of the role, so a workspace role has no Instance
  permissions. A box in the header, on each row and on each action header selects or clears the
  permissions of the tab, the row or the column. "Copy from a role" copies the permissions of a
  role, and "Undo" puts back the permissions from before the copy.
- The roles lists no longer scroll sideways when a role has many permissions. Before, the hidden
  copy of the permission chips made the table wider, and the "From the instance" table of a
  workspace scrolled out of the Role column.
- The thumb of the segmented control moves faster to the selected item. It is on the item in about
  200 ms, and the full move takes 380 ms in place of 590 ms.
- Between and beside the icons of the rail, a click does nothing and the cursor does not change.
  Before, a click that missed an icon by a few pixels opened the rail. A drag on the edge of the
  open rail sets the width of the sidebar. Before, only the closed rail let the user set it.
- A member and a holder of a role show if they are a person, an agent or another app. One component,
  `Identity`, shows each actor with its own avatar: a circle with initials for a person, a square
  with a bot for an agent, a square with blocks for another app. The card "About this role" no
  longer shows a holder as a plain name.
- The pickers of a member, the page of a member and the list of the roles show each actor with its
  avatar and its kind. A picked member is a chip with a remove button. The Holders column of the
  roles shows the first holders as a stack of avatars. `Identity` has the formats `mention`, `chip`
  and `header`, and `SearchSelect` has a `chip` snippet for the chosen option.
- A click on the logo, between the rows or on the footer of the open rail closes the rail. Only a
  click on the handle, or a click that opens a menu of the rail, keeps it open. Before, a click on
  the logo or between the rows did not close it.
- The "+N" card of the permissions in the roles list keeps all its chips inside the card. The card
  becomes wider to fit the longest row, and the actions that do not fit go under the name of the
  resource.
- The Roles card of a member shows the workspace as a header with its icon and its kind, not as one
  more role. The projects are inside the workspace. In Effective access, Change roles, the remove
  dialog and the members of a project, a scope is an icon and a name, not a pill.
- All the actions that delete, remove, revoke, disable or deactivate are red: in menus, in the rows
  of tables and lists, in headers and in the confirmation dialogs. In a menu, they are the last
  items, after a separator. The danger zones of the account, of a user, of an agent and of an app
  have the same look.
- The tabs Linux, macOS, Windows and Docker of the install of an agent have the same space under
  them as above them. Before, the selected tab touched the bottom edge of the tab list.
- The pagination of the jobs and of the pipelines, the end of the project list and the selection bar
  on a phone stay above a button that floats at the bottom right. A module gives the height of this
  button in `ShellContributions.bottomInset` of `@scylla/core-sdk`.
- A page that a role opens does not ask for what the role cannot read, and does not link to a page
  that the role cannot open. The dashboard hides the pipelines and the runs, the agents hide their
  stats, and the editor of a pipeline asks for the secrets only with their permission. A cell of the
  role editor tells on hover what a click on it also checks.
- In the roles list, the Holders cell opens a card on hover and on keyboard focus. The card gives
  the number of people, agents and apps, and at most six holders, each with the workspace or the
  projects where it has the role. A holder and "See all members" open the page of the members. A
  reader who cannot see the members sees only the count, as before.
- The Windows hint of the install of an agent tells that the command needs no admin rights, and how
  the install for the user and the service are different. The Windows command of the logs reads the
  log of the agent of the user, or else the logs of the service.
- The pipeline editor opens on a still canvas. Before, the view moved and zoomed while it centred on
  the nodes. Now the Scylla logo shows until the graph is in place, then the graph and the side
  panel fade in. A failed load shows in the canvas, with Try again.
- The role editor checks the view of all the workspaces with a permission of a workspace or of a
  project in a role of the instance, as the server does. On the page of an agent, the rename and the
  revoke of a key and a new join code need the permissions of their routes, and the creator of the
  agent also gets them. On the dashboard, a person with only roles on projects opens each project
  that the person can see.
- The agent page shows the timeline from the day that the agent joined, when the agent has a job
  that ended. Before, an agent younger than 7 days had no timeline. A strip with few days keeps thin
  bars at the right, the first day and "Today" do not overlap, and the window of one day keeps room
  for its two handles.
- A radio, a checkbox or the icon of an alert in a card is centered vertically on the whole card,
  not on the line of the title: the project cards and the info card of the add agent page, the token
  presets, the cron frequencies, the role levels, the role boxes and the warning banners. The copy
  button of a command is centered on the command, and "No log was written." is centered in its log
  panel.
- The button of a danger zone and of a settings section is centered vertically on the title and the
  description, not on the line of the title. On a phone, the button goes under the description, and
  the text keeps the full width of the card.
- The repository page says "The GitHub App has no webhook." for a link that polls for this reason,
  and the test webhook says it with no raw error of GitHub.
- The pipeline item of the breadcrumb on the jobs, job and triggers pages opens the editor of an
  editor pipeline. Before, it opened the read-only page of a file pipeline, with the error "Scylla
  could not read the file".
- The jobs table of a pipeline fits in a container of 900 px or more and does not scroll to the
  side. The Source cell shows the commit on two lines: the author and the title, then the SHA with
  the state of the report, the ref and the pull requests. The actions of a job go into a menu when
  their column is too narrow for the buttons.
- The breadcrumb of the top bar stays on one line. Before, a long id put it on three lines, and the
  window cut the first line. Only the id of the current page gets shorter, with an ellipsis. A job
  page names its pipeline one time, with its name, also after a link or a reload.

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

[Unreleased]: https://github.com/scylla-ops/scylla-web/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/scylla-ops/scylla-web/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/scylla-ops/scylla-web/releases/tag/v0.5.0
