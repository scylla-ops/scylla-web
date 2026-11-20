import type { MarketPackage } from '@base/features/marketplace/domain/entities/market-package.entity.ts';

/** The packages shared by the other organizations of Scylla. */
export interface MarketplaceRepository {
  list(): Promise<MarketPackage[]>;
  /** Throws a `ScyllaError` with `NOT_FOUND` for an unknown id. */
  getById(id: string): Promise<MarketPackage>;
  /** The star of the reader. */
  setStar(id: string, starred: boolean): Promise<MarketPackage>;
}
