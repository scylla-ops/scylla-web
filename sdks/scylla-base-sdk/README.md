# `@scylla/base-sdk`

> [Scylla frontend](../../README.md) › `sdks/scylla-base-sdk` ·
> [agent guide](./AGENTS.md) · [architecture](../../docs/architecture.md)

**The API for building on Scylla.** An extension that adds features to Scylla uses this package
to read the active organization, check permissions, call the backend and reuse the data of the
Scylla features. It is the only access to [`scylla-base`](../../extensions/scylla-base/README.md)
for other extensions.

```typescript
import { Permission, can, contextStore, grpcTransport, ScyllaResult } from '@scylla/base-sdk';
```

## What it gives

| Area | Exports | Use |
|------|---------|-----|
| Access control | `Permission`, `can`, `authorizationReady`, `Can`, `RequirePermission` | Put a permission on a route, show or hide a control. |
| Context | `contextStore`, `scyllaNavigate` | Read the active organization, project and pipeline. Navigate inside them. |
| Backend | `grpcTransport` | The gRPC-Web transport, with authentication. Give it to your generated clients. |
| Errors | `ScyllaResult`, `ScyllaError` | Return errors as values from your data sources, like the Scylla features. |
| Features | query factories, query keys, entity types, page loaders | Reuse the data of a Scylla feature, e.g. `jobQueries`, `JobEntity`, `loadJobsPage`. |

Each [module README of scylla-base](../../README.md#scylla-base--features) documents its public
API.

## Example

A module of another extension, with a page in each organization of Scylla:

```typescript
import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import { Permission, grpcTransport } from '@scylla/base-sdk';

const invoiceRepository = new DefaultInvoiceRepository(new GrpcInvoiceDataSource(grpcTransport));

export const BillingModule = {
  id: 'billing',
  domain: { invoiceRepository },
  routes: {
    organization: [
      {
        path: 'billing',
        permission: Permission.READ_ORGANIZATION,
        breadcrumb: () => ({ label: msg`Billing` }),
        page: () => import('./presentation/ui/Billing.page.svelte'),
      },
    ],
  },
} satisfies ScyllaModule;
```

The page is at `/:organizationSlug/billing`. It is inside the Scylla shell, behind the Scylla
login and the Scylla access check. [`@scylla/core-sdk`](../core-sdk/README.md) shows how to
declare the extension.

## Rules

- **Import `@scylla/base-sdk`, never `@scylla/base`.** A dependency-cruiser rule
  (`sdk-is-the-door`) makes sure of this.
- **Need something that is not exported?** Add the export to the `index.ts` of the feature that
  owns it. The owners of the feature then see and review the change to their public API.
- **A query exported here runs outside the route guard of its feature.** It must check its own
  permission (`jobsByPipelinesQueries` is the model).

## Design decisions

**A facade with no code.** The public API of scylla-base is already the `index.ts` of each
feature and of each `platform/` capability. This package only re-exports them. Thus there is one
instance of each store and one query cache, and the owners of a feature keep its public API
where they work on it.

**A boundary that a tool checks.** Because other extensions can only use this package, the
public surface of scylla-base is explicit, and CI checks it.

## Related

- [`scylla-base`](../../extensions/scylla-base/README.md) — the extension behind this package.
- [`@scylla/core-sdk`](../core-sdk/README.md) — how to declare an extension and its modules.
