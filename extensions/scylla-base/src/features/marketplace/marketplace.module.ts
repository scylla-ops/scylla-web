import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart';
import type MarketplaceRepository from '@base/features/marketplace/domain/repository/marketplace.repository.ts';
import { DefaultMarketplaceRepository } from '@base/features/marketplace/infrastructure/repository/default-marketplace.repository.ts';

const marketPlaceRepository: MarketplaceRepository = new DefaultMarketplaceRepository();

export const MarketplaceModule = {
  id: 'marketplace',
  domain: {
    marketplaceRepository: marketPlaceRepository,
  },
  routes: {
    organization: [
      {
        path: 'marketplace',
        page: () => import('./presentation/ui/Marketplace.page.svelte'),
        nav: {
          section: 'organization',
          title: msg`Marketplace`,
          icon: ShoppingCartIcon,
          order: 50,
        },
      },
    ],
  },
} satisfies ScyllaModule;
