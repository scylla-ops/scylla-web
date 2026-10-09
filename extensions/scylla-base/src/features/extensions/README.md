# Extensions

> [Scylla frontend](../../../../../README.md) › `features/` › **extensions** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

A page that lists the extensions the app runs: name, id, version, dependencies, and how many
modules and pages each one adds. Later, it is where an extension is installed, enabled or
disabled.

Reachable at `/:org/extensions`, with a sidebar entry under the system section.

## Why the page is here and not in the core

Only the core knows which extensions it loaded, so the core gives the list. It does so through
`@scylla/core-sdk` (`installedExtensions()`), like the navigator and the DI registry.

The page itself cannot live in the core:

- The core has no mount. The mounts (`app`, `organization`, `project`) are declared by
  scylla-base's `ShellModule`. A core page would have to name one, and so know an extension.
- The core does not know what a permission is. The type comes from scylla-base, and every page
  in the shell must be able to declare one.
- The shell renders links, it does not decide them. Every sidebar link comes from a module.

And the next steps — install, enable, disable — need a backend and permissions. That is
business, so it belongs in an extension.

## How it is built

**Domain** is one struct, `InstalledExtension`, and one repository interface. The struct is
plain data: it does not carry the manifest, so the domain does not depend on the core SDK.

**Infrastructure** is one repository that receives `installedExtensions` and maps each manifest.
It reads the list at each call: the module file loads before the core installs it.

**Presentation** is one query with `staleTime: Infinity` — the loaded extensions do not change
while the app runs — and a grid of cards in the style of the apps page.
