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
presentation/
  shell-params.ts                       breadcrumbParams, linkParams (from the context store)
  report-query-error.ts                 the one error toast, sign-out on UNAUTHENTICATED
  router/
    AppLayout.svelte                    layout of the `app` mount: AuthGuard + OrganizationGate
    AuthGuard/                          token present? → the pages, else /login
    OrganizationSync.wrapper.svelte     URL slug → context store (organization-sync.svelte.ts)
    OrganizationRedirect.wrapper.svelte `/` → the user's organization (organization-redirect.svelte.ts)
    ContextCleaner.wrapper.svelte       drops stale project/pipeline context (context-cleaner.svelte.ts)
    LoginRedirect.svelte                the fallback for a URL that no route matches
  layout/
    shell.state.svelte.ts               organizations query, permission sync, first organization
    whats-new.svelte.ts                 seen flags (reactive), markNavSeen
    sign-out.ts
    ui/OrganizationGate/                loading screen / first organization / the pages
    ui/FirstOrganization.svelte         welcome screen when the user has no organization
    ui/context-selector/                OrganizationSelector (the header of the organization section)
    ui/NavUser/                         current user + sign-out (sidebar footer)
    ui/NewBadge.svelte                  "New" pill of a sidebar link (navBadge)
    ui/WhatsNewDialog/                  first-launch release announcement (overlay)
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
  organization   /:organizationSlug                       wrapper OrganizationSyncWrapper
  project        /:organizationSlug/projects/:projectId   wrapper ContextCleanerWrapper, crumb "Project"
routes           app: / -> OrganizationRedirectWrapper · organization: (its root) -> 'dashboard'
navSections      organization (header: OrganizationSelector), system
access           can / authorizationReady / RequirePermission, from @platform/authz
shell            sidebarFooter NavUser · overlays WhatsNewDialog · navBadge NewBadge ·
                 onNavOpen markNavSeen · breadcrumbParams · linkParams
onQueryError     reportQueryError
onQueryRetry     retryQueryError
fallback         LoginRedirect
```

**Never add a page here.** Adding a page is a change to one feature's `*.module.ts`. This file
changes only for a new mount, a new section or a new part of the shell.

## The wrappers

- The wrappers own the **URL → store** direction of context sync. The URL is the source of
  truth. Do not add a store → URL sync.
- **A wrapper reads its parameters once, when it mounts.** The router mounts the wrappers again
  for each new pathname; during the exit animation the old wrappers stay on screen, so they must
  not react to the new URL.
- The effects read the context store with `untrack`, else the old and the new wrapper could set
  the store one after the other.
- `ContextCleanerWrapper` also handles a project id that no longer exists (redirects out).

## The shell parts

- `linkParams` gives the sidebar links the slug of the **active organization** (context store).
  `breadcrumbParams` gives the crumbs `organizationName`, `projectName`, and `pipelineName` —
  the name of the active pipeline only when it is the one in the URL, else its id, so the crumb
  identifies its pipeline also after a reload.
- `OrganizationSelector` shows `OrganizationList` from `features/organization` and opens
  `AddOrganizationDialog`, both through the **loaders** of its barrel.
- `createShellState()` is created once, in `OrganizationGate`. It loads the organizations of
  the user, and an effect calls `syncMyPermissions` (`features/roles`) when the active
  organization or project changes. It is the only writer of the permissions store.
- `reportQueryError` is the app's single error report. **A query or a mutation must not add its
  own `onError` toast.** A *query* that fails on the network signs out (the UI is served by the
  control plane, so "unreachable" and "no longer authenticated" look the same); a *mutation*
  only toasts.

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
- **Announcing a new feature is editing `whats-new.ts`, nothing else.** Add a highlight (`id`,
  `title`, `description`, `icon`, and `navUrl` when it is a page); the dialog and the sidebar
  badge follow. Bump `WHATS_NEW.version` at each release: the seen flags are keyed by it.
- The shell may read a feature's queries, but must not own business logic.
- After moving a component in or out of `shell/`, run `node scripts/restore-translations.mjs`.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean. New strings: `pnpm extract && pnpm compile`.
