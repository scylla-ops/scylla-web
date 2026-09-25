# `@scylla/core`

> [Scylla frontend](../../README.md) › `packages/core` ·
> [agent guide](./AGENTS.md) · [architecture](../../docs/architecture.md)

The part of the frontend that is not Scylla: it starts an application made of extensions. It
loads them, compiles the routes their modules declare, runs the router, and draws the frame
around the pages — the sidebar, the top bar with the breadcrumbs, the theme and language
switches.

What goes in the frame is not decided here. The sections of the sidebar, its links, the context
selector in its header, the user menu in its footer, the gate in front of the pages, the check
that guards a page — each one comes from a module of an extension. The core renders them in
their place.

## Why the core knows no business

The first shell of Scylla imported fourteen features: it knew the organizations, the
permissions, the login token. A second product (Scylla Cloud) or a community extension could
only add pages by editing it. Now the core depends on no extension, and the rule is checked by
dependency-cruiser: everything Scylla-specific is in `extensions/scylla-base`, and another
extension adds its pages and shell parts the same way.

## One declaration per page

Each module declares its pages once:

```typescript
export const AgentsModule = {
  id: 'agents',
  domain: { agentsRepository },
  routes: {
    organization: [
      {
        path: 'agents',
        permission: Permission.LIST_AGENTS,
        breadcrumb: () => ({ label: msg`Agents` }),
        page: () => import('./presentation/ui/Agents/Agents.page.svelte'),
        nav: { section: 'organization', title: msg`Agents`, icon: HardDriveIcon, order: 40 },
      },
    ],
  },
} satisfies ScyllaModule;
```

The router, the sidebar and the breadcrumbs come from this declaration. A link is part of its
route, so it takes the URL and the permission of the route: a link cannot show for a page that
will deny you. The page is lazy: the guard and the breadcrumbs read the static fields without
loading its chunk.

## Mounts

A module does not restate the nesting of the app. It puts its routes under a **mount** — e.g.
`organization`, at `/:organizationSlug` — and the mount brings its layout, its wrappers and its
crumb. The mounts themselves are declared by a module too (scylla-base: `ShellModule`), so an
extension can graft pages on the mounts of another one.

## A tree to write, a flat table to match

A module writes a tree, with `children`. At start-up, `compileRoutes` flattens all the trees
into one table of full paths, sorted so that the first match is the most specific. The flat
table is also what lets two modules share a path without an import: the crumbs of a page are
the crumbs of each path that its path starts with. Two modules that set the same field on one
path make the start-up fail — there is no silent override.

## Why there is no router library

The app first used `sv-router`. It used only its path matching and its history: its nested
layouts could not give route parameters to the wrappers, its page swap could not keep the old
page for the exit animation, and its merge of route metadata could not build a breadcrumb
trail. With a flat table, what remains is small: a loop to match, `history.pushState`, and a
click listener for links. The router uses the History API, not the Navigation API, because
Firefox ESR and jsdom do not have the latter.

## Related packages

- [`@scylla/core-sdk`](../../sdks/core-sdk/README.md) — the contract that the core implements.
- [`@scylla/ui`](../ui/README.md) — the primitives the shell is built from.
- [`scylla-base`](../../extensions/scylla-base/README.md) — the mounts, sections and shell parts of Scylla.
