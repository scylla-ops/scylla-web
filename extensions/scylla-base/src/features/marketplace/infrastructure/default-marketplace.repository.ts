import type MarketplaceRepository from '@base/features/marketplace/domain/repository/marketplace.repository.ts';
import type { MarketItem } from '@base/features/marketplace/domain/structs/market-item.struct.ts';

export class DefaultMarketplaceRepository implements MarketplaceRepository {
  // TODO: replace this fake data with a call to the backend.
  getMarketplace(): Promise<MarketItem[]> {
    return Promise.resolve([
      { provider: 'Corp', title: 'Title', descrption: 'Description' },
      { provider: 'Corp', title: 'Title', descrption: 'Description' },
      { provider: 'Epitech', title: 'TestFiltre', descrption: 'Description' },
    ]);
  }
}
