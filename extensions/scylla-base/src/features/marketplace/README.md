# Marketplace

> [Scylla frontend](../../../../../README.md) › `features/` › **marketplace** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

Pipeline fragments shared by the organizations of Scylla. A workspace browses them, reads what
one runs and needs, and adds it to its library: **linked**, to receive the new versions of the
publisher, or as a **fork**, an editable copy that the workspace owns.

Reachable at `/:org/marketplace` (Browse, in the Marketplace group of the sidebar), and a
package at `/:org/marketplace/:packageId`.

## The pages

**Explore** lists the packages in a grid, with a search, a sort and a sidebar: verified or
official publishers, categories and stacks, each with what it would keep. Two more tabs show the
packages already in the library and those the workspace publishes. A card tells whether a
package is in the library, and on which version when the publisher is ahead.

**A package** shows its steps and parameters, each public version (an older one can be added too), and what it
needs before it is added: the secrets each pipeline gives it, the tools of the agent, the hosts
it reaches. Add to library opens a dialog: linked or fork, the version, the name in the library.
The new fragment then opens in the library.

Publishing goes the other way and lives in the library: a fragment of the workspace goes public
from its page, under `@workspace/name`, after checks on its defaults and nodes.

## Status: front-end complete, backend pending

The server has no marketplace yet. `DefaultMarketplaceRepository` serves demo packages and keeps
the stars of the reader in the browser, with a `TODO`. The pages, the queries and the domain are
written against `MarketplaceRepository`: wiring the server is confined to `infrastructure/`.

## Related modules

- [pipeline](../pipeline/README.md) — the library: linked and forked fragments, upstream
  versions, publication.
