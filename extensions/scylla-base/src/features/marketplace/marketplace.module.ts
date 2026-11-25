import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import CompassIcon from '@lucide/svelte/icons/compass';
import StoreIcon from '@lucide/svelte/icons/store';
import { Permission } from '@platform/authz';
import type { MarketplaceRepository } from '@base/features/marketplace/domain/repository/marketplace.repository.ts';
import { DefaultMarketplaceRepository } from '@base/features/marketplace/infrastructure/default-marketplace.repository.ts';
import { MarketplaceServiceClient } from '@base/generated/scylla/marketplace/v1/marketplace_service.client.ts';
import { marketplaceTransport } from '@platform/grpc';

// The packages of the marketplace that Scylla hosts: the library of fragments adds them, in the
// pipeline feature.
const marketplaceRepository: MarketplaceRepository = new DefaultMarketplaceRepository(
  new MarketplaceServiceClient(marketplaceTransport.getTransport()),
);

export const MarketplaceModule = {
  id: 'marketplace',
  domain: {
    marketplaceRepository,
  },
  routes: {
    workspace: [
      {
        path: 'marketplace',
        permission: Permission.LIST_PIPELINES_BY_WORKSPACE,
        breadcrumb: () => ({ label: msg`Marketplace` }),
        page: () => import('./presentation/ui/Marketplace/Marketplace.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`Browse`,
          icon: CompassIcon,
          order: 50,
          group: { id: 'marketplace', title: msg`Marketplace`, icon: StoreIcon },
        },
        children: [
          {
            path: ':packageId',
            permission: Permission.LIST_PIPELINES_BY_WORKSPACE,
            breadcrumb: () => ({ label: msg`Package`, detail: msg`Detail` }),
            page: () => import('./presentation/ui/Package/Package.page.svelte'),
            share: true,
          },
        ],
      },
    ],
  },
} satisfies ScyllaModule;
