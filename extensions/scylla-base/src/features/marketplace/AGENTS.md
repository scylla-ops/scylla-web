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

## The repository

`DefaultMarketplaceRepository` calls `MarketplaceService` of the marketplace that Scylla hosts,
through `marketplaceTransport` (`VITE_MARKETPLACE_API_URL`, else `VITE_API_URL`). Its reads need
no token: the token of the session goes only to the server that issued it. The star needs a
session of that server. A list gives the content of the latest version of each package only; a
read gives each public version. The protos are a copy in `extensions/scylla-base/protos`
(`protos/README.md`). There are no demo packages: the page shows what the server holds.

## Layout

```
marketplace.module.ts                       routes + nav + DI wiring (private; registry only)
index.ts                                    public API
domain/
  entities/market-package.entity.ts         MarketPackage, PackageVersion, Publisher, the stacks
  repository/marketplace.repository.ts
infrastructure/
  default-marketplace.repository.ts         MarketplaceService, on marketplaceTransport
  grpc-market-package.mapper.ts             a package, its versions decoded (versionFromContent)
presentation/
  marketplace.queries.ts                    marketplaceQueries, marketplaceMutations.setStar
  messages/marketplace.messages.ts
  presenters/
    package-filter.presenter.ts             search, publisher switches, facets and their counts, order
    library-status.presenter.ts             where a package stands in the library, cardBadge
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
