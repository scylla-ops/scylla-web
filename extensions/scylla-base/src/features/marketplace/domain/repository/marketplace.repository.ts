import type { MarketItem } from '@base/features/marketplace/domain/structs/market-item.struct.ts';
import type { ScyllaResult } from '@shared/utils/scylla-result.ts';

export default interface MarketplaceRepository {
  getMarketplace(): Promise<ScyllaResult<MarketItem[]>>;
}
