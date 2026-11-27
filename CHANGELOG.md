# Changelog

All notable changes to Scylla Web are in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before 1.0.0, a minor version
(0.8.0) can change what an extension imports, the API or the data in a way that is not
compatible. A patch version (0.7.1, 0.7.2) adds features and fixes that stay compatible.
An entry marked **Breaking** changes what a host repo or an extension imports
(`@scylla/ui/*`, `@scylla/core-sdk`, `@scylla/base-sdk`).

## [Unreleased]

### Added

- A Mail page in the administration of the server (Admin > Mail, after Settings) sets the SMTP relay
  that sends the mails of Scylla, with no restart: host, port, security (TLS on connect, STARTTLS or
  no encryption), user name, password or API key, and sender address and name. A provider list
  fills the host, the port and the security for Scaleway TEM, LWS, Brevo, Postmark, Amazon SES and
  Mailjet, and tells what to type as the user name and the password. The password is write-only:
  the page shows only "Set" or "Not set", and an empty field keeps the saved password. "Send a test
  mail" sends a mail at once through the saved settings and shows the answer of the mail server, or
  its error. "Use the server default" removes the settings and the saved password after a
  confirmation, and Scylla uses the mail server of its configuration again. The page needs the
  permission to manage the settings of the instance.
- Each password field has a button to show and hide the typed text.
- Each project can have its own icon: a glyph of the icon set with a theme color or a free color, or
  an uploaded image. The icon shows on the project card, in the projects of the sidebar and in the
  project header, where a member that can edit the project opens the icon picker. A color with low
  contrast shows as a solid tile.
- A new projects page. Each card shows the linked repository, a badge with the count of failing
  pipelines, the first pipelines with their status, branch and time, and the last job or the next
  cron. A click on a pipeline opens its jobs, and its Run button runs it in one click. The page has
  the counts of the workspace, a search ("/" goes to it, Escape clears it), the filters All, Failing
  and Running, and a sort by name, last job or failures first, all kept in the URL. "Show more"
  replaces the page numbers: 6 cards (3 on a phone), then 12 more each time.
- Each user can set a profile photo in Account > Profile: an uploaded image, or the initials on a
  color. The photo shows in the account menu, in the account header and in the member lists. An
  admin of the workspace can set the icon of an agent on the agent page, with the icon picker of the
  projects: a glyph with a theme color or a free color, or an image. The icon shows in the list of
  the agents, on the agent page, on its jobs and in the member lists.
- A new account that signs up with GitHub or an OIDC provider gets the photo of the provider as its
  profile photo. If the download fails, the account keeps the initials. In Account > Profile, "Use
  my <provider> photo" makes the photo of a linked account the profile photo again, after a
  confirmation when a photo is set.
- The projects page has groups, pins and a custom order. A member that can edit the projects creates
  a group with "New group", and opens, closes, renames, moves or deletes each group section, which
  shows its count and its health. Each person pins projects in a "Pinned" zone at the top. The menu
  of a card has Pin, Change the icon, Move to group, Move up and Move down, Edit, Duplicate and
  Delete. The sort has "Custom order", the default, and in this order the "Reorder" mode lets you
  drag the cards to a group, to a place or to the pins: Done saves the order, Cancel or Escape
  reverts it. On a phone, the page has no Reorder, no New group and no Select all.
- The What's new dialog now moves to the next version by itself, with a progress bar and a slow
  scroll, and loops until you close it. Any input pauses it, and it starts again 1.8 seconds after
  the last input.
- Each workspace can have its own icon, with the icon picker of the projects: a glyph with a theme
  color or a free color, or an uploaded image. A new workspace shows a building on a grey tile. The
  icon is in the forms that create or edit a workspace, in the workspace switcher and its list, and
  in the header of the workspace settings, where a member that can edit the workspace opens the icon
  picker. Each project group can have a folder color: a theme color or a free color. The color is in
  the forms that create or rename a group, on the folder of the group header (a click opens the
  colors) and in "Move to group" of a card. The sidebar of the projects shows the structure of the
  projects page: the pinned projects, each group with its folder color, then the projects with no
  group, in folding sections that the page and the sidebar share. A dot shows on a project with a
  job that runs.
- In the reorder mode of the projects page, you can also move the groups: drag the handle of a group
  header (the sections stay open, and a line shows the new place), or use the keyboard (Space lifts
  the group, the arrow keys move it, Space drops it and Escape cancels). On a phone, "Move up" and
  "Move down" in the group menu move the group. "Done" saves the order of the groups and "Cancel"
  forgets it. Each section of the projects page can have its own display: comfortable cards, compact
  cards, a list or tiles, and a denser display shows more items before "Show more". "Display" in the
  toolbar sets the display of the page, and "Apply to all sections" gives it to each section. The
  menu of each section, also of Pinned and No group, sets the display of that section. Each person
  keeps the choice for each workspace. On a touch screen, the "+" and "..." buttons of a section
  header are larger.
- Glyph avatars (DiceBear "Glyphs", CC BY 4.0). An editor with a large preview gives the 35 shapes
  and the Scylla head, the colors of the figure and of the background (solid, linear or radial), and
  mirror, rotation and size. A person opens it from the profile photo card, the account menu or the
  command palette, and the icon picker of an agent or an app has an Avatar tab. Activity shows the
  Scylla head for a change that Scylla made. The account page shows the credit of the style.

### Changed

- What's new shows one tab for each version, an icon tile for each item, and new, clearer texts. It
  opens again one time for each user. The 0.7.3 tab announces the new Projects page, the icons and
  avatars of projects, workspaces, people, agents and apps, the search bar that finds more, and the
  smoother interface. The Projects link of the sidebar shows a "New" badge until you open it.
- The search bar shows five filters (Pages, Actions, Projects, Library, Team and infra). A filter
  with no result hides while you type.
- The account menu no longer shows "Make an avatar". The editor stays on Account > Profile, in the
  icon picker and in the command palette.

### Fixed

- Job page: the job title row now wraps on narrow screens, so the page does not scroll sideways.
- The verify email page no longer shows a raw server message in a toast for a link that is not
  valid.
- On the job page, the Report row of Details shows the last state of the report when the job ends.
  Before, it showed "In progress" until a reload.
- Escape and a click outside now ask to skip the tour at the first step of a tour.
- The form to send the verification link again no longer shows an email error before the user types.
- The report icon in the jobs list now updates when a job ends, with no reload.
- The report icons of the jobs list stay on screen when a job changes status, and a new job shows in
  the list with no refresh.
- The forgot password and sign-up pages no longer show a form error before the user types.
- The What's new dialog keeps the same height on each tab, and only the tab panel scrolls.
- The page not found inside a workspace now shows the navigation of the workspace, not endless
  loading placeholders.
- Job page: the agent of the job shows with its own icon in the header and in Details, in place of a
  generic server icon. An agent with no icon shows the default agent icon. The agent icon card and
  its dialog now name the same places: the list of the agents, the agent page and the jobs.
- A project URL with an unknown project id, or an id with a wrong form, now shows the "Page not
  found" page with no project sidebar, no crumb and no error toast, and no longer sends the user to
  the dashboard.
- Each form that creates or edits a project or an app has an icon field: Edit of a project, a new
  regular project, a new project from GitHub, a new agent and a new app (API token, CI identity or
  key pair). The field shows the icon, opens the icon picker (a glyph with a theme color or a free
  color, or an image) and has Reset. Save keeps the icon with the other fields, and Cancel removes
  the change. If the item is created but its icon is not saved, an error message tells it. The page
  of each app shows its icon and has the icon card, and the app list shows the icon of each app.
  "Change the icon..." on the project card and the icon of the project header stay as shortcuts.
- In the reorder mode of the projects page, the drop slot now follows the dragged card: it goes to
  the place nearest to the center of the card, wherever you hold it, also on more than one row and
  between the cards. The other cards slide to their new places, the card goes into its slot when you
  release it, and Escape sends it back. The page does not move when the mode starts or stops, and
  shows no skeleton or old order: "Done" and "Cancel" take the place of "Reorder" and "Display", and
  the other controls stay in their place, disabled. With no pin, the drop zone of the pins shows
  over the toolbar only during the drag of a card. The controls cross-fade, and the drop slot and
  the drop zones fade in and out. With reduced motion, each change is instant.
- Dialogs, alert dialogs, side sheets, tabs, field messages, table rows, cards, badges, banners,
  empty states, folding sections and the selection actions of a list header now have a short motion
  when they appear, go away or change: a fade with a small rise, a fold in height, or a roll for a
  count. A fade or a fold takes 150 to 250 ms, the exit is shorter than the entry, and a page that
  opens shows no motion of its parts. With the reduced motion setting of the system, each change is
  instant.
- In the dark theme, the rail and the second sidebar are now lighter than the page.
- The corner logo is larger.
- The profile initials take a free color, as the icons of the projects and the agents: the theme
  colors, or a color picker with a hex field. The initials stay readable on each color, in the light
  and the dark theme. The photo or the initials color of a person now shows in each place: the rail
  button and the account menu, the account header, the member lists, the role holders, the command
  palette and the activity of the dashboard. The palette and the dashboard also show the icon of
  each project and agent. A click on your own avatar (the account menu, the account header) opens
  the editor of your photo.
- Projects page: each group now has a "+" in its header, "New project here" in its menu and a ghost
  card to create a project in this group, and the project forms have a Group field. The sidebar and
  the search bar also open a new project in a group. A folded group shows one line with its first
  projects and "+N".
- Each empty list now has its add action, for a person who can add: the pipelines of a project (New
  pipeline), the jobs of a pipeline (Run), the triggers, the secrets, the members of a workspace or
  of a project (Add members), the personal tokens, the agents and the apps. An empty Capacity widget
  adds an agent, and an empty Pipelines widget adds a pipeline in its project, or a project. The
  list of the dashboards has a "+" on its title. The search bar has "Add members" and "Add members
  to this project".
- The search bar (Ctrl K) now finds the project groups, the dashboards and the fragments of the
  library. It also asks the server for the jobs (by their number "#...", branch, pipeline or
  project), the triggers, the secrets of each project (names only), the users of the instance (for
  an instance admin) and the packages of the marketplace: 200 ms after the last key, from 2
  characters, with a small "Searching..." line. Each kind shows only to a person who can open its
  pages. A group row shows the folder color of the group and its number of projects, and opens the
  projects page on this group: the group opens, comes into view and its header flashes once. A
  dashboard row tells if the dashboard is personal or shared, and names the person that shares it. A
  project row shows the icon of the project and its group, with the folder color. A failed job has
  "Rerun...", a trigger has "Disable..." or "Enable", and a secret has "Copy" for its name, never
  its value. The recent list keeps these rows too. The rows fade in.
- Workspace switcher of an instance admin: your workspaces show first, then the 5 workspaces of
  other users with the last activity, each with its icon and its owner, and the entry "All
  workspaces…". The search also finds a workspace by the name, handle or email of its owner. A new
  page, Administration > Workspaces, lists all the workspaces with their icon, owner, members,
  projects, creation date and last activity, with a search, an order and pages from the server. In
  the command bar, a workspace row shows its icon, its owner, your role and its counts, and no part
  of its id.
- Each place that names a workspace shows its icon: the notification rows and their workspace
  filter, the invitation rows, the scopes of the member pages, and the Workspaces column of Admin >
  Users, with the owner of each workspace. A notification row and an open invitation also show the
  avatar of the person who acted. On a phone, the sidebar sheet shows the links of the modules, for
  example the projects. In the projects of the sidebar, a project with a failed last job shows a
  failed status, and a folded group keeps a mark for a project that runs or failed.
- The search palette no longer cuts its left edge when many filter chips show. The chip row now
  scrolls in its own box.
- The count of the row "All workspaces" in the workspace switcher of an instance admin now shows the
  total of the page that it opens, with the own workspaces.
- The status "No run yet" is now a dashed ring. It no longer looks like the drag grip of the Reorder
  mode.
- A group of the projects page (with Pinned and No group) and a section of the second sidebar now
  open and fold in one smooth move. The header that you click stays in place. Only the content below
  it moves, one time, with no jump when the cards and their pipelines load. With a reduced motion,
  nothing moves.
- A click moves less of the UI. The submit buttons of the dialogs keep their width while they save
  ("Create" and "Creating...", "Save" and "Saving..."), and the Save button of the pipeline editor
  shows its spinner in place of its label. On each list page, a selection does not move "Select all"
  and "New": "Clear" and "Delete" come on the left, and "Select all" stays in its place, disabled
  when all items are selected. The widgets of the dashboard do not move down when the edit mode
  starts, and the bar of the dashboard on a phone keeps its height. The row actions of the workspace
  switcher keep their room. A legal document keeps its Save button in place, disabled until a
  change, and its preview has the size of its text. The buttons of the App wizard and of the tour
  introduction keep one width at each step. The pages keep the room of the scroll bar, so a page
  that grows does not move to the left.
- An empty group now shows in the second sidebar and the phone menu with a "New project" row, and
  the group menu has a "Folder color..." item.
- The icon dialogs and the pipeline export dialog keep one top edge and one minimum height, and
  their buttons stay at the bottom, so the tabs and the buttons no longer move when you change tabs.
- Opening a folded project group no longer waits for the network: the page reads the pipelines of
  the folded groups in advance, so the group opens in one motion.
- The project menu marks the place where the project is now, and a drag of a pinned card onto the
  pins shows that it is already pinned.
- A form no longer keeps an empty line under each field. An error line now slides in under its field
  and slides out when the error goes, and the fields below move with it.
- The icon field of each create and edit form (project, workspace, agent, app) is centered: a large
  preview, then "Change the icon" and Reset under it. "Change the icon" opens the icon editor on a
  second screen that slides in, with a Back button and the chosen icon next to its title. In a
  dialog, the dialog keeps its size and Escape goes back first. The colors of the icon picker are
  centered, and the drop zone of the Image tab fills the tab.
- Each field error in the forms of the app (mail settings, triggers, pipeline editor, roles, GitLab
  token, and others) now slides in and out like the other errors, and the fields below move with it.
- The icon editor tabs can be clicked again, and switching between the Icon and Image tabs on a page
  no longer moves the fields below.

## [0.7.2] - 2026-11-25

### Added

- A "Copy link" button in the top bar of the pages that a member opens again from a link: a job, a
  pipeline, its jobs, a project, a fragment, an agent, an app, a package and a dashboard. It copies
  the link and tells who can open it. On a phone, it opens the share sheet. The filters of the jobs,
  the branch and tab of a file pipeline and the tab of a package are in the link. A private
  dashboard has no button. In English and French.
- The command bar has a short tour and shows examples to try when it is empty. Start the tour again
  from Help & tours.
- A click on the start node of a saved pipeline or a file pipeline opens its triggers in the side
  panel. The panel shows the triggers of the file as read only, and the schedules and webhooks of
  Scylla with a switch, an edit and a delete. Each trigger shows its last run and its next run. You
  can add a schedule in the panel. The start node shows the number of triggers. In English and
  French.
- A project that takes its pipelines from the repository files keeps its Scylla pipelines in the
  same list, with a source badge on each row. The editor refuses a name whose key a pipeline file
  already has, and tells which file. A workspace admin allows the push, pull request and tag
  triggers of a Scylla pipeline in such a project, after a warning, and can revoke them. In the
  merge rules, a Scylla pipeline stays off, tells why, and opens its export to a file. In English
  and French.
- The log viewer has a text size field with - and + buttons, from 10 to 32 px, next to the S, M and
  L sizes.
- A "Send the link again" button for an email that is not verified: on the sign-in page, on the
  page after sign-up, and on the page of an expired or used verify link. In English and French.

### Changed

- The command bar underlines the letters of each result that match the text that you typed, also
  with a typing error.
- The job page shows the nodes beside the log, in a list or as the graph, and only the log scrolls.
  The log shows the terminal colors, has a search with a counter, goes from error to error with E
  and Shift+E, and opens in full screen with F. Display settings stay in the browser. A link keeps
  the node, the full screen and the line (#L150). In English and French.
- The Triggers panel of a Scylla pipeline in a GitHub project shows the Git events opt-in: Push,
  Pull request and Tag stay off until an admin allows them.
- What's new shows the 0.7.1 and 0.7.2 highlights first, then the 0.7.0 highlights. The dialog opens
  again one time for each user, and each highlight keeps the seen flag of its version. In English
  and French.
- A sign-up with an email that is not verified sends a new verify link. The page after sign-up
  shows the typed email and the address that the mails come from, and tells you to look in the spam
  folder. In English and French.
- The Details panel of the job page is shorter: one row for each of Run, Source and Report, with
  each fact on one line.

### Fixed

- Two flaky tests no longer fail the CI at random.
- The pipeline editor accepts a name with spaces, like the server. It now refuses only an empty
  name, a name longer than 100 characters and a name on more than one line.
- The Save button of the pipeline editor no longer leaves the page. The editor stays open after a
  save.
- The dashboard widgets open their pages. A pipeline name, a job, a mark of a run, an agent, a
  trigger, a project and an activity event are links, so a middle click opens a new tab, and a
  tooltip tells what a click opens. A bar of one day or one week shows that period on the dashboard.
- Each widget kind in the widget picker has its own preview icon that looks like the widget.
- The read-only page of a file pipeline lets you look at the pipeline. A click on a node, or Enter
  on a focused node, shows each field of the node in the side panel, with the script, a Copy button
  and a way back. The view fits the full graph, and you can drag the nodes or click Arrange: Scylla
  keeps their places, and the file and the version do not change.
- The fragment page no longer shows a separator dot at the start of the line under the title when
  the fragment has no description.
- The reason of a pending job that waits for agent labels starts with a capital letter and says
  "label" for one label.
- The page that creates a pipeline has the "Agent labels" button of the editor. Create saves the
  labels with the pipeline, so its first job goes only to an agent with each label. In English and
  French.
- The command bar (Ctrl K) has a What's new entry. It opens What's new like the user menu item.
- A node dropped on the pipeline canvas joins the closest node before it, shows a dashed preview of
  its link, and Alt drops it with no link.
- Full editor and Cancel in the new schedule form of the Triggers panel no longer create the
  schedule.
- The command bar tour keeps the focus in the search field, so Tab still changes the filter. The
  example searches show right below the field.
- The descriptions of the widgets in the widget picker all start with a capital letter, and the
  statuses in the Runs per day tooltip use one case.
- The What's new row now shows in the command bar when the field is empty.
- Create and Save are now off, with the reason, while the typed pipeline name is the key of a
  pipeline file.
- The "Try a search" examples now show right below the field during the command bar tour, also when
  you have recent picks.
- Create and Save turn on as soon as the typed pipeline name is free, also after a click on the off
  button.
- The legends of the Runs per day, Timeline and Webhooks widgets now use capitalized labels, like
  the tooltips, and the Run duration widget text writes p50 and p95 in lower case.
- The Follow button of the job log viewer now turns on again after you turn it off. A finished job
  shows a "Go to the end of the log" button in its place.
- The "Find anything fast" tour now goes to its end: opening a result continues the tour on the new
  page, and Escape or a click outside the bar asks to continue or leave.
- The French job page shows the no-break space before a colon in two texts, with no broken
  character.

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

[Unreleased]: https://github.com/scylla-ops/scylla-web/compare/v0.7.2...HEAD
[0.7.2]: https://github.com/scylla-ops/scylla-web/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/scylla-ops/scylla-web/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/scylla-ops/scylla-web/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/scylla-ops/scylla-web/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/scylla-ops/scylla-web/releases/tag/v0.5.0
