import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { MarketPackage } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
import type { MarketplaceRepository } from '@base/features/marketplace/domain/repository/marketplace.repository.ts';
import { seedPackages, type SeedPackage } from './marketplace-seeds.ts';

const STARS_KEY = 'scylla.marketplace-stars';

type StarStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** As a server would: an error comes back as a rejected promise, never thrown at the call. */
const answer = <T>(read: () => T): Promise<T> => new Promise(resolve => resolve(read()));

/**
 * TODO: the server has no marketplace yet. This repository serves demo packages, and keeps the
 * stars of the reader in the browser; a gRPC repository replaces it in `marketplace.module.ts`,
 * and the domain contract and `marketplaceQueries` stay the same.
 */
export class DefaultMarketplaceRepository implements MarketplaceRepository {
  private readonly packages: SeedPackage[] = seedPackages();

  constructor(private readonly storage: () => StarStorage = () => localStorage) {}

  public list(): Promise<MarketPackage[]> {
    return answer(() => {
      const stars = this.readStars();
      return this.packages.map(pkg => this.toEntity(pkg, stars));
    });
  }

  public getById(id: string): Promise<MarketPackage> {
    return answer(() => this.toEntity(this.find(id), this.readStars()));
  }

  public setStar(id: string, starred: boolean): Promise<MarketPackage> {
    return answer(() => {
      const pkg = this.find(id);
      const others = this.readStars().filter(starredId => starredId !== id);
      const stars = starred ? [...others, id] : others;
      this.storage().setItem(STARS_KEY, JSON.stringify(stars));
      return this.toEntity(pkg, stars);
    });
  }

  private find(id: string): SeedPackage {
    const pkg = this.packages.find(candidate => candidate.id === id);
    if (!pkg) throw new ScyllaError(`No package ${id}`, { code: 'NOT_FOUND' });
    return pkg;
  }

  /** The star of the reader counts with the others. */
  private toEntity(pkg: SeedPackage, stars: string[]): MarketPackage {
    const starred = stars.includes(pkg.id);
    return { ...pkg, starred, stars: pkg.stars + (starred ? 1 : 0) };
  }

  /** Something unreadable in the storage is no star. */
  private readStars(): string[] {
    try {
      const stored: unknown = JSON.parse(this.storage().getItem(STARS_KEY) ?? '[]');
      return Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }
}
