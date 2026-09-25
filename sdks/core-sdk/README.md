# `@scylla/core-sdk`

> [Scylla frontend](../../README.md) › `sdks/core-sdk` ·
> [agent guide](./AGENTS.md) · [architecture](../../docs/architecture.md)

The contract of an extension. An extension compiles against this package and nothing else of
the core: it declares itself with `@Extension`, its pages and links with `ScyllaModule`, and it
reads the router, the DI registry and the query client through the functions here.

## Why a separate package

The core is an implementation: route compilation, the router, the shell, the loader. If an
extension imported it, every change there would be a change of the extension API. So the core
implements what this package describes, and installs it at start-up (`setAppNavigator`,
`setDependencyRegistry`, `setQueryClient`). An extension only sees the contract.

This is the same idea as the barrels of the features, one level up: a feature reaches another
through its `index.ts`, an extension reaches the core through `@scylla/core-sdk`.

## Why a decorator, and why the rest is in modules

`@Extension` on a class is short and reads as what it is. The class carries the manifest; the
app lists the classes, so the load order and the set of extensions are visible in one typed
file (`apps/web/src/extensions.ts`) instead of being a side effect of which files were imported.

The manifest is small because the modules carry the rest. A sidebar link is declared on the
route it opens (`nav`), so a link cannot exist for a page that is gone, and it takes the
permission of that page. The mounts, the sidebar sections and the parts of the shell are also
module fields: the module that builds the frame of an extension declares them, next to the
pages that use them.

## Why the permission type is registered

Routes carry a `permission`, and the core guards the page and hides the link with it — but the
core cannot know Scylla's `Permission` enum. The owning extension augments `Register`, so the
field keeps its real type in every module, and the core passes the value to the extension's
`AccessPolicy` without looking inside.
