import type { IMarketplaceServiceClient } from '@base/generated/scylla/marketplace/v1/marketplace_service.client.ts';
import type { Package } from '@base/generated/scylla/marketplace/v1/package.ts';
import { required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type { MarketPackage } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
import type { MarketplaceRepository } from '@base/features/marketplace/domain/repository/marketplace.repository.ts';
import * as grpcMarketPackage from './grpc-market-package.mapper.ts';

const PAGE_SIZE = 100;

/**
 * The marketplace that Scylla hosts (`MarketplaceService`). Its reads need no token: a front of
 * another server reads it too. The star needs a session of the server of the marketplace.
 */
export class DefaultMarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly client: IMarketplaceServiceClient) {}

  public async list(): Promise<MarketPackage[]> {
    const packages: Package[] = [];
    let token = '';
    do {
      const response = await this.client.listPackages({ page: { size: PAGE_SIZE, token } }).response;
      packages.push(...response.packages);
      token = response.page?.nextToken ?? '';
    } while (token);
    return packages.map(grpcMarketPackage.toDomain);
  }

  public async getById(id: string): Promise<MarketPackage> {
    const { package: pkg } = await this.client.getPackage({ packageId: wrapId(id) }).response;
    return grpcMarketPackage.toDomain(required(pkg, 'package'));
  }

  public async setStar(id: string, starred: boolean): Promise<MarketPackage> {
    await this.client.setPackageStar({ packageId: wrapId(id), starred }).response;
    return this.getById(id);
  }
}
