# `platform/context` — agent guide

Which workspace / project / pipeline the user is currently looking at, and navigation derived
from it.

**Layer** `platform/` · alias `@platform/context`

## Import rules

- **MUST NEVER import a feature** (`platform-knows-no-feature`, error).
- May import `@shared/*` and other platform capabilities through their `index.ts` only.
- Consumers import `@platform/context` — the barrel, never a deep path.

## Public API — `index.ts`

```typescript
contextStore
scyllaNavigate, type ScyllaNavigate       context-aware navigation (goToUser, goToAccount, …)
workspaceUrl(name, path = 'dashboard') the URL of a page of any workspace, for a link
navigateTo, navigateBack                  plain navigation
currentPathname, currentSearch            the current URL
setAppNavigator, type AppNavigator, type NavigateOptions
createResourceError                       NOT_FOUND on a detail page → toast + redirect
```

## The identifier-only rule

`contextStore` holds **ids and display names, nothing else**:

```typescript
workspace: { id, name, slug }
project:      { id, name }
pipeline:     { id, name }
setWorkspace(id, name, slug)   // also clears project + pipeline
renameWorkspace(name, slug)    // the same workspace: project + pipeline stay
setProject(id, name)
setPipeline(id, name)
reset()
```

This is business context, which is why it is in `platform/` rather than `shared/` — but it is
deliberately identifier-only, so it never needs to know what a project *is*. That is what keeps
it below the features that own those entities.

**Never widen it.** Adding a `ProjectEntity` here would make `platform/` import a feature and
break the layer. If a component needs more than an id and a name, it reads the id from here and
runs that feature's query.

The names are a copy of the data of the server, and a reload keeps them. Something must write each
new name: for a project, `projectMutations.update` and `cleanContext` of the shell; for a
pipeline, the navigation functions that take a name and `namePipeline` of the shell. A delete also
needs a writer: `projectMutations.remove` clears the project and the pipeline when the project is
the active one.

Persistence: `createStore` (`@scylla/ui/stores`) keeps it in
`localStorage` under key `scylla-workspace-context`, so a reload keeps the user where they were. The stored
format does not change: a context stored by an earlier version stays valid.

## Cascade on workspace change

`setWorkspace` **clears `project` and `pipeline`**. A project id from another workspace is
meaningless and would produce a broken URL or a cross-tenant query. Preserve that behaviour if
you touch the store.

`renameWorkspace` does not clear them: the id does not change, so they stay valid. The name and the
slug in the store are a copy of the data of the server. The shell keeps them equal to the list of
workspaces in `syncWorkspace`, so do not write them from a mutation.

`reset()` exists for sign-out; the shell also uses `ContextCleaner.wrapper.svelte` to drop
context when leaving a scope.

## Layout

```
index.ts                             public API
context.store.ts                     the store (persisted)
scylla-navigate.ts                   context-aware navigation
resource-error.state.svelte.ts             createResourceError
```

## The navigator

The navigator of the app is in `@scylla/core-sdk`; `index.ts` re-exports `navigateTo`,
`navigateBack`, `currentPathname`, `currentSearch` and `setAppNavigator` beside
`scyllaNavigate`, which builds on them. `startCore` installs the router
(`setAppNavigator(createAppRouter(…))`), and a test installs a fake one with
`installTestNavigator` from `test/navigator.ts`. Nothing else knows the router.

- `navigateTo` accepts a relative target: `'..'` is the parent page, `'members'` is a child
  page.
- `currentPathname()` and `currentSearch()` are reactive while the router is installed.

## Rules that bite here

- **`scyllaNavigate` is the only sanctioned way to navigate between scoped screens.** It builds
  URLs from the current context so callers do not hand-assemble
  `/${workspaceSlug}/projects/${projectId}/…`. A template string passed to `navigateTo` is how a route
  change becomes fourteen broken links.
- **The URL is the source of truth, the store is the mirror.** The shell's
  `WorkspaceSync.wrapper.svelte` syncs the store *from* route params. Do not add a second sync
  in the other direction — that is the effect cascade this design exists to avoid.
- Server state never goes in here. Only TanStack Query holds fetched data.
- `contextStore` and `selectionStore` (`@shared`) are the app's **only** two global
  stores. Adding a third needs a real justification.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
