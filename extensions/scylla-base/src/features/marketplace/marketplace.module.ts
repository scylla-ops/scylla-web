import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import CompassIcon from '@lucide/svelte/icons/compass';
import StoreIcon from '@lucide/svelte/icons/store';
import type { MarketplaceRepository } from '@base/features/marketplace/domain/repository/marketplace.repository.ts';
import { DefaultMarketplaceRepository } from '@base/features/marketplace/infrastructure/default-marketplace.repository.ts';

const marketPlaceRepository: MarketplaceRepository = new DefaultMarketplaceRepository();

export const MarketplaceModule = {
  id: 'marketplace',
  domain: {
    marketplaceRepository: marketPlaceRepository,
  },
  routes: {
    workspace: [
      {
        path: 'marketplace',
        page: () => import('./presentation/ui/Marketplace.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`Browse`,
          icon: CompassIcon,
          order: 50,
          group: { id: 'marketplace', title: msg`Marketplace`, icon: StoreIcon },
        },
      },
    ],
  },
} satisfies ScyllaModule;
