# Shell (scylla-base)

> [Scylla frontend](../../../../README.md) › `extensions/scylla-base` › `shell/` ·
> [agent guide](./AGENTS.md) · [architecture](../../../../docs/architecture.md)

What turns the core's generic frame into Scylla: the list of feature modules, and one module,
`ShellModule`, that declares everything around the pages — the mounts, the sidebar sections,
the organization selector, the user menu, the release announcement, the access policy and the
error policy.

The frame itself (the sidebar, the top bar, the breadcrumbs) is drawn by
[`@scylla/core`](../../../../packages/core/README.md). This folder only fills it.

## One list, and one module for the frame

`modules.ts` holds the feature modules, in the order of the sidebar. The extension
(`scylla-base.extension.ts`) is `ShellModule` plus that list. From it the core derives the
router, the sidebar and the DI registry: there is no second list to keep in sync.

The list imports each `<feature>.module.ts` **by path**, never the feature's `index.ts`.
Barrels re-export UI, and importing one here would drag every page into the initial chunk. It
is the only deep import into a feature, and dependency-cruiser enforces that no one else does it.

## The mounts: the skeleton, not the pages

`ShellModule` declares the places where the features graft their routes, and what each brings:

```
public         /                                  ← /login, outside the shell
app            /  AppLayout, in the core's shell   ← token or redirect; an organization or the welcome screen
organization   /:organizationSlug                 → sync the org into context
project        /:organizationSlug/projects/:id    → clean stale context, "Project" crumb
```

It owns two pages of its own: `/` sends you to your organization, and `/:organizationSlug`
redirects to its dashboard. Everything else is a feature's page. Adding a page means editing
one feature's declaration; `ShellModule` changes only for a new mount or a new shell part.

## Context follows the URL

Three small wrappers keep the [context store](../platform/context/README.md) honest:

- **`OrganizationRedirectWrapper`** — landing on `/` sends you to your organization (the one you
  last used, or your first).
- **`OrganizationSyncWrapper`** — resolves the `:organizationSlug` in the URL to a real
  organization and writes it into the store.
- **`ContextCleanerWrapper`** — clears project and pipeline context when it goes stale, and
  redirects out if the `:projectId` in the URL is not a project you have.

They all sync in one direction: **URL → store**. The URL is the source of truth. That is what
makes a pasted link work, and why no wrapper syncs the other way.

## What Scylla gives the core's frame

- The two **sidebar sections**, `organization` (with the organization selector in its header)
  and `system`. The links themselves are declared by the features, on their routes.
- The **access policy**: `can` and `RequirePermission` from [authz](../platform/authz/README.md).
  The core calls them for every page that declares a `permission`, and for every link.
- The **parameters** the core cannot know: the slug of the active organization for the links,
  the names of the organization, project and pipeline for the crumbs.
- The **user menu**, the **"New" badge** and the **release dialog** of `whats-new.ts`.
- The **error policy**: every query and mutation error goes to `reportQueryError`. An
  `UNAUTHENTICATED` response, or a query that cannot reach the control plane, clears the token
  and sends the user to `/login`; anything else is a toast. **Do not add your own `onError`
  toast to a mutation.**

## Related modules

- [`@scylla/core`](../../../../packages/core/README.md) — the frame, the router and the loader.
- [platform/context](../platform/context/README.md) — the store the wrappers write to.
- [platform/authz](../platform/authz/README.md) — the access policy.
