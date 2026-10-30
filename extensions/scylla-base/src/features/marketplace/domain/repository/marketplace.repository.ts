import type { MarketItem } from '@base/features/marketplace/domain/structs/market-item.struct.ts';

export interface MarketplaceRepository {
  getMarketplace(): Promise<MarketItem[]>;
}
