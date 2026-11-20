# `features/marketplace` — agent guide

The fragments that the organizations of Scylla share: browse them, read one, add it to the
library of the workspace, linked or as a fork.

**Layer** `features/` · **id** `marketplace` · **DI key** `marketplaceRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

Reads and writes are declared as options objects in `presentation/*.queries.ts`, which a
component or another feature runs with `createQuery`.

## Who owns what

The **pipeline** feature owns the library: a fragment knows where it comes from
(`FragmentEntity.source`, linked or forked) and whether the workspace publishes it
(`FragmentEntity.publication`). This feature owns the packages of the other organizations. It
imports the pipeline barrel (`fragmentQueries`, `fragmentMutations.addFromMarketplace`,
`FragmentNodes`, `FragmentParameters`, `VersionBadge`, `FragmentIcon`); pipeline never imports
it. A package is linked to a fragment by `PackageRef.packageId`, the id of the package.

## Public API — `index.ts`

```typescript
type MarketPackage, PackageVersion, PackageRequirement, PackageStack, Publisher
marketplaceQueries, marketplaceMutations, MARKETPLACE_QUERY_KEY, PACKAGE_QUERY_KEY
```

Never add: `marketplace.module.ts`, pages.

## Data contract

`MarketplaceRepository` — `domain/repository/marketplace.repository.ts`:

| Method | Returns |
|---|---|
| `list()` | `MarketPackage[]`, with the star of the reader |
| `getById(id)` | `MarketPackage`. An unknown id is `NOT_FOUND` |
| `setStar(id, starred)` | `MarketPackage` |

## ⚠ The repository is local

The server has no marketplace yet. `DefaultMarketplaceRepository` serves the demo packages of
`marketplace-seeds.ts` and keeps the stars of the reader in `localStorage`
(`scylla.marketplace-stars`). It carries a `TODO`. The demo library of the pipeline feature
links and forks some of these packages, by the same ids.

The packages that the workspace publishes are not in the repository: `ownPackages` builds them
from the public fragments of the library. A server lists them with the others, and that helper
goes.

When wiring the real backend:

1. Add `infrastructure/grpc-market-package.mapper.ts`.
2. Give `DefaultMarketplaceRepository` the generated `I…ServiceClient` in its constructor, and
   build it in `marketplace.module.ts` with `grpcTransport.getTransport()`.
3. Delete the `TODO`, the seeds and `ownPackages`.

## Layout

```
marketplace.module.ts                       routes + nav + DI wiring (private; registry only)
index.ts                                    public API
domain/
  entities/market-package.entity.ts         MarketPackage, PackageVersion, Publisher, the stacks
  repository/marketplace.repository.ts
infrastructure/
  default-marketplace.repository.ts         the demo packages, the stars in localStorage
  marketplace-seeds.ts
presentation/
  marketplace.queries.ts                    marketplaceQueries, marketplaceMutations.setStar
  messages/marketplace.messages.ts
  presenters/
    package-filter.presenter.ts             search, publisher switches, facets and their counts, order
    library-status.presenter.ts             where a package stands in the library, ownPackages, cardBadge
    package.presenter.ts                    stack names, counts, steps line, secrets
  ui/
    PublisherLine.svelte
    Marketplace/                            Explore: tabs, sidebar filters, grid (marketplace.state)
    Package/                                one package: header, status, versions, before you add it,
                                            the add dialog (package-page.state, add-to-library.state)
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `workspace` | `marketplace` | `LIST_PIPELINES_BY_WORKSPACE` | `MarketplacePage` |
| `workspace` | `marketplace/:packageId` | `LIST_PIPELINES_BY_WORKSPACE` | `PackagePage` |

Sidebar: section `workspace`, title Browse in the group Marketplace, order `50`. The command bar
test finds it as `page:workspace/marketplace`.

Adding a package needs `UPDATE_PIPELINE`, as saving a fragment from the editor does: the
buttons hide without it.

## Rules that bite here

- A **linked** fragment keeps the numbers of the publisher, and gets the versions after the one
  added as `upstream`, for an admin to accept or skip on its page. A **fork** starts at v1 and
  only shows the next release. `createAddToLibrary` builds the input; the pipeline repository
  does the rest.
- The facet counts are taken within the search and the verified switch, not within the other
  checkboxes: a reader sees what each one would keep.
- Filter state is the criteria of the reader only. The packages stay in TanStack Query and the
  list is derived during render.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
