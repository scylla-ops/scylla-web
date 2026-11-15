# `shell` (scylla-base) — agent guide

The Scylla frame around the pages: the list of feature modules, and `ShellModule` — the
mounts, the sidebar sections, the access policy, the shell parts and the error policy that
the core renders. The generic frame (sidebar, top bar, breadcrumbs, theme, language) is in
[`@scylla/core`](../../../../packages/core/AGENTS.md).

**Folder** `extensions/scylla-base/src/shell/`

## Import rules

- May import features — **through their `index.ts`** (`shell-uses-feature-api`, error). The one
  exception: `modules.ts` imports each `<feature>.module.ts` by path.
- **No feature may import `shell/`** (`no-feature-imports-the-shell`, error). If a feature
  seems to need something from here, it belongs in `shared/`, `@scylla/ui`, or the feature.
- The core never imports it: `ShellModule` reaches the core as a module of the extension.

## Layout

```
modules.ts                              THE list of feature modules, in sidebar order
shell.module.ts                         ShellModule: mounts, routes of the shell, nav sections,
                                        access, shell parts, onQueryError, onQueryRetry, fallback
whats-new.ts                            THE release announcement
__test__/feature-permissions.test.ts    conformance: features gate, shared queries check
__test__/destructive-actions.test.ts    conformance: an action that deletes, removes, revokes or
                                        disables has the destructive variant (`@scylla/ui`, "Destructive actions")
__test__/choice-cards.test.ts           conformance: a radio, a checkbox or a switch in a label is centered
                                        on the label, here and in `@scylla/ui` (`@scylla/ui`, "Rules that bite here")
presentation/
  shell-params.ts                       breadcrumbParams, linkParams (from the context store)
  report-query-error.ts                 the one error toast; on UNAUTHENTICATED `closeSession`, `loginPathBackTo` (login);
                                        on a conflict of a mutation, a warning toast and `invalidateQueries()`
  router/
    AppLayout.svelte                    layout of the `app` mount: AuthGuard + WorkspaceGate
    AuthGuard/                          hasSession: the pages, or /login; no answer: a retry view, not /login
    PersonalLayout/                     layout of the `personal` mount: AuthGuard + a centered column, no gate
    WorkspaceSync.wrapper.svelte     URL slug → context store (workspace-sync.effect.svelte.ts)
    WorkspaceRedirect.wrapper.svelte `/` → the user's workspace (workspace-redirect.effect.svelte.ts)
    last-workspace.ts                   the key `last-workspace` of `platform/user-state`
    ContextCleaner.wrapper.svelte       URL project → context store, drops stale project/pipeline context,
                                        names the pipeline of the URL (context-cleaner.effect.svelte.ts)
    NotFound/                           the fallback for a URL that no route matches: a text and a link to /.
                                        It has no session check: / goes through AuthGuard
  layout/
    shell.state.svelte.ts               workspaces query, permission sync, first workspace
    project-links.state.svelte.ts       projectLinks: the projects of the workspace after "All projects"
                                        (secondSidebarLinks); it reads them only while they show
    whats-new.state.svelte.ts                 seen flags (reactive, key `whats-new-seen` of `platform/user-state`), markNavSeen
    ui/WorkspaceGate/                loading screen / first workspace / the pages
      FirstWorkspace.svelte          welcome screen when the user has no workspace
    ui/context-selector/                WorkspaceSelector: the switcher at the right end of the top bar (topBarEnd)
    ui/ShellBrand/                      the logo above the sidebars (brand): a link to the dashboard of the active workspace
    language.commands.ts                the commands of the bar for the language
    user-preferences.ts                 the keys `theme` and `locale` of `platform/user-state`, chooseLocale
    ui/GlobalSearch/                    the button of the top bar and Ctrl K. It loads the bar at the first use and keeps the form that a command opens
    ui/CommandBar/                      the command bar: see "The command bar"
    ui/NotificationsMenu/               the bell of the top bar: the badge and the popover. The panel is in features/notifications
    ui/NavUser/                         who is signed in (userQueries.me), Account, Help & tours, Language, Sign out
                                        (sidebar footer); green on the rail while the URL is on the account or the help page
    ui/SessionLine/                     "Signed in as … · Account · Sign out", one centered line, outside the sidebar
    ui/NewBadge.svelte                  "New" pill of a sidebar link (navBadge)
    ui/WhatsNewDialog/                  first-launch release announcement
    ui/LaunchOverlays/                  THE overlay: the announcement first, then the onboarding tour
    ui/layout.messages.ts               every message of the shell
locales/                                the shell's own catalog
```

## `modules.ts` — the only list

Adding a feature = add its `*.module.ts` to `modules`. **Registration order decides sidebar and
route order within a section** (after `NavLink.order`). Import the `*.module.ts`, never the
feature's `index.ts`: the barrel re-exports UI, and the manifest would pull every page into the
entry chunk. `module-declaration-is-private` enforces that no other module does the same.

## `ShellModule` — what Scylla adds to the core

```
mounts
  public         /                                        no layout, no guard
  app            /                                        layout AppLayout, shell: true
  personal       /                                        layout PersonalLayout (no shell, no workspace)
  workspace   /:workspaceSlug                       wrapper WorkspaceSyncWrapper
  project        /:workspaceSlug/projects/:projectId   wrapper ContextCleanerWrapper, crumb "Project"
routes           app: / -> WorkspaceRedirectWrapper · workspace: (its root) -> 'dashboard'
navSections      workspace, project (within projects, title: projectName), instance (railItem),
                 account and help (noRailItem: the user menu opens them), notifications (noRailItem: the bell
                 opens it)
access           can / authorizationReady / RequirePermission, from @platform/authz
shell            brand ShellBrand · topBarEnd GlobalSearch, NotificationsMenu, WorkspaceSelector · sidebarFooter NavUser · overlays LaunchOverlays · navBadge NewBadge ·
                 onNavOpen markNavSeen · secondSidebarLinks projectLinks · breadcrumbParams · linkParams
onQueryError     reportQueryError
onQueryRetry     retryQueryError
fallback         NotFoundPage
```

**Never add a page here.** Adding a page is a change to one feature's `*.module.ts`. This file
changes only for a new mount, a new section or a new part of the shell.

## The command bar

`ui/CommandBar/`:

```
CommandBar.svelte                the dialog
CommandBarContent.svelte         the input, the chips, the rows, the status lines, the footer
command-sources.state.svelte.ts  the lists. Each list reads only with its permission, while the bar is open
command-rows.presenter.ts        builds a CommandRow from each page, command and entity
command-results.presenter.ts     prefixes, chips, groups, order, limits
command-recent.ts                the recent rows of a workspace, in localStorage
CommandConfirm.svelte            the confirmation in the bar
RunPipelineConfirm.svelte        the same for a run
```

Rules:

- A feature adds a command in its `presentation/<feature>.commands.ts`, and declares it in `commands`
  of its `*.module.ts`. A new page needs no command: the bar reads the sidebar links with `navLinks()`.
  Add `keywords` to a link when a user can use another word for the page.
- A command has a kind, and the kind sets the verb: `go` Go to, `create` Create..., `choice` Use, `toggle`
  Turn on or Turn off, `confirm` the verb of the command. Three dots mean that a step follows. No real
  command uses `toggle` now. The first one is the on/off of a trigger.
- A command must make a change that the user can see. `SidebarProvider.open` is not such a change: on a
  desktop, `DoubleSidebar` does not read it. Do a browser check for a new command: a test of a value does
  not show this error.
- A command has a `permission`. `apps/web/src/__test__/module-permissions.test.ts` fails if it has none.
  A command with no permission goes in `UNGATED_COMMANDS`, with the reason.
- **The bar never deletes.** Add a delete command only with a new decision.
- A row must not read the same as another row. `ui/CommandBar/command-bar-labels.test.ts` checks this,
  and checks the typing errors on the real labels in the two languages. Run it when you add a label.
- A list of the bar uses `notifyOnChangeProps: 'all'`. TanStack tells only the changes of the fields that
  were read, and the bar reads the state of a list at the first key.
- A form stays open after the bar closes, so `GlobalSearch` keeps it, not the bar.

## The wrappers

- The wrappers own the **URL → store** direction of context sync. The URL is the source of
  truth. Do not add a store → URL sync.
- **A wrapper reads its parameters once, when it mounts.** The router mounts the wrappers again
  for each new pathname; during the exit animation the old wrappers stay on screen, so they must
  not react to the new URL.
- The effects read the context store with `untrack`, else the old and the new wrapper could set
  the store one after the other.
- `syncWorkspace` keeps the store equal to the list of workspaces, also when the list changes after
  the mount. A new name goes to the store with no navigation. A new slug of the active workspace
  opens the same page under the new slug. This starts from the list of the server, so it is not a
  store → URL sync.
- `ContextCleanerWrapper` also handles a project id that no longer exists: it redirects out, and it
  does not render the page of a project that `cleanContext` knows is gone.
- `cleanContext` reads the project of the URL with `projectQueries.byId`, and keeps the project of
  the store equal to the answer, also when the answer changes after the mount. So a project on any
  page of the list, a direct link, a search result and a rename in another tab give the correct
  name. It writes only while the URL still points at its project, because a read can end during the
  exit animation.
- **The answer `null` proves "gone" only with `canListProjects`.** The server gives the same code
  for an unknown project and for a refusal. `project.view` permits the read of one project and the
  list, so a person who can list the workspace is never refused for a project that exists. A custom
  role with `pipelines.view` only can be on a project page and be refused: this person stays on the
  page. A project of another workspace also counts as gone.
- **`cleanContext` compares only after `syncWorkspace` wrote the workspace of the URL.** It is the
  child effect, so it runs first. Without this wait, a browser back after a change of workspace
  counts the project as gone.
- **`projectQueries.byId` has no `can()` gate here.** The permissions of a project load only for the
  project of the store, and `cleanContext` writes this project. A gate never opens.
- `namePipeline` gives the store the name of the pipeline of the URL (`pipelineQueries.byId`, with
  `READ_PIPELINE` in `enabled`). A link, a reload or a search result opens a pipeline page with no
  name in the store, and the crumbs then show the id. It reads only when the store does not name
  this pipeline, because the editor page reads the same key, and a refetch replaces its draft. It
  follows the answer in the cache, thus a saved rename goes to the crumbs. Like `cleanContext`, it
  writes only while the URL still points at its pipeline.
- A full load of a deleted or unknown URL shows one error toast: the page mounts and its own list
  fails before the read of the project answers. The wrapper does not hold the page until this
  answer, because each first entry in a project would then wait for one more call.

## The shell parts

- `linkParams` gives the sidebar links the slug of the **active workspace** (context store).
  The top bar shows the workspace in its switcher, so no crumb names it.
  `breadcrumbParams` gives the crumbs `projectName`, and `pipelineName` —
  the name of the active pipeline only when it is the one in the URL, else its id, so the crumb
  identifies its pipeline before `namePipeline` has the name, and for a person without
  `READ_PIPELINE`.
- `ShellBrand` is a plain link: the router follows it, and a Ctrl click opens a new tab. It reads
  the slug from `linkParams`, so it follows a change of workspace. With no active workspace it
  opens `/`, and `/` picks the workspace of the user.
- `WorkspaceSelector` shows `WorkspaceList` from `features/workspace` and opens
  `AddWorkspaceDialog`, both through the **loaders** of its barrel.
- `createShell()` is created once, in `WorkspaceGate`. It loads the workspaces of
  the user, and an effect calls `syncMyPermissions` (`features/roles`) when the active
  workspace or project changes. It is the only writer of the permissions store.
- `reportQueryError` is the app's single error report. **A query or a mutation must not add its
  own `onError` toast.** A failure on the network never ends the session: only the server ends
  it, with `UNAUTHENTICATED`. A *query* that fails on the network shows one shared toast and the
  user stays on the page; a *mutation* only toasts. A failure with `repeated` shows no new toast:
  the user was told at the first failure, and a focus or a poll fails again at each turn. It still
  goes to the console, and `UNAUTHENTICATED` still ends the session.
- A *mutation* that the server refused because the item changed since it was read (`ABORTED`,
  `isConflict()`) is shown as a conflict, with a warning toast in the words of the app, and
  `reportQueryError` invalidates every query (`getQueryClient().invalidateQueries()`), so that
  the screen shows what the server has. The client does not know which item the server
  refused, and a conflict is rare: one full invalidation is cheap. A page adds nothing of its
  own for it.
- On `UNAUTHENTICATED`, `reportQueryError` signs out and loads `loginPathBackTo(window.location)`
  (`features/login`): after the sign-in, the user comes back to the page, with its query and its
  fragment. The return path is in the fragment of `/login`, thus a token of the page (the
  `/invite#token=...` page of an extension) never goes into a query. On `/login` itself, and for
  a path that `safeReturnPath` refuses, it loads the plain `/login`.
- When the server gives no answer about the session, `hasSession` rejects. On a first load, the
  auth guard shows a retry view and tries again every 5 seconds. With a loaded page, the page
  stays.

## `__test__/feature-permissions.test.ts`

It reads source, enumerated from `modules`:

1. **A feature that mutates gates something in its UI.**
2. **A query another feature imports checks for itself.** Crossing a barrel means running
   outside the owner's route guard.

Both are **completeness, never correctness**. `UNGATED_FEATURES` and `UNCHECKED_SHARED_HOOKS`
are ratchets. Entries marked `SEEDED DEBT` or `TRIAGE` are open questions, not decisions. The
page-level rule (every page in the shell declares a `permission`) is in
`apps/web/src/__test__/module-permissions.test.ts`, because it enumerates every extension.

## Rules that bite here

- `localStorage.token` is a three-way contract: `features/login` writes it, `platform/grpc`
  reads it for the auth header, `AuthGuard` reads it to redirect. Change all three at once.
  The shell never writes the session: the menu calls `signOut` and the error report calls
  `closeSession`, both from `features/login`.
- `NavUser` shows the person with `IdentityAvatar`, imported **by path**
  (`@shared/presentation/ui/data-display/IdentityAvatar/IdentityAvatar.svelte`): the barrel of
  `@shared/presentation/ui` re-exports the other shared components, and this file is in the entry
  chunk. "Who am I" is `userQueries.me`, never `localStorage.userId`.
- After the first workspace, the shell opens its dashboard (`workspaceUrl(name)`).
- **A user with no workspace is not stuck.** Under its card, the first-workspace screen
  shows `SessionLine` ("Signed in as <name>", "Account" to `/account`, "Sign out"). It shows the
  create form only with `CREATE_WORKSPACE`; without it, it asks the user to wait for an
  administrator. The `personal` mount (`PersonalLayout`: `AuthGuard`, the logo and a centered
  column like the sign-in pages, a "Back" link to `/` above the page; no `WorkspaceGate`, no
  sidebar) holds the pages that need no workspace: `/account`. The page itself puts the
  sign-out after its last section: the router places a page out of the flow of its layout
  (`PageTransition`), so nothing can follow `children` in a layout.
- **No screen has a top bar.** The core's dark-mode toggle is fixed in the top-right corner of
  every screen: keep that corner empty.
- `LaunchOverlays` shows one window at a time: the release announcement while it is unseen,
  then the onboarding tour (`loadOnboardingTour`). Do not mount a first-launch window beside it.
  It waits for `userState.whenLoaded()`, so a new device does not show a window that the person
  already closed.
- `/` opens the workspace of the key `last-workspace` when it is on the list of the person, else the
  local context, else the first workspace. A new device thus opens the last workspace of the person.
- **The dashboard is the default page of a workspace.** `workspaceUrl(slug)` with no path gives it:
  `/`, a change of workspace, a project that is gone and the link of the not-found page all land
  there. Give a path only for another page.
- `locale` and `last-workspace` have `upload: false`: the load of a page writes these local values,
  so a local value does not prove a choice of the person. Only `chooseLocale` and
  `rememberWorkspace` send them.
- **Announcing a new feature is editing `whats-new.ts`, nothing else.** Add a highlight (`id`,
  `title`, `description`, `icon`, and `navUrl` when it is a page); the dialog and the sidebar
  badge follow. Bump `WHATS_NEW.version` at each release: the seen flags are keyed by it.
- The shell may read a feature's queries, but must not own business logic.
- After moving a component in or out of `shell/`, run `node scripts/restore-translations.mjs`.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean. New strings: `pnpm extract && pnpm compile`.
