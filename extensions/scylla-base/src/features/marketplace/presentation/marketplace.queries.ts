import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type { MarketPackage } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
import type { MarketplaceModule } from '../marketplace.module.ts';

const repository = () =>
  getModuleDomain<typeof MarketplaceModule.domain>('marketplace').marketplaceRepository;

export const MARKETPLACE_QUERY_KEY = () => ['marketplace'] as const;
export const PACKAGE_QUERY_KEY = (id: string) => ['marketplace', 'package', id] as const;

export const marketplaceQueries = {
  list: () =>
    queryOptions<MarketPackage[]>({
      queryKey: MARKETPLACE_QUERY_KEY(),
      queryFn: () => repository().list(),
      staleTime: 60_000,
    }),

  byId: (id: string) =>
    queryOptions<MarketPackage>({
      queryKey: PACKAGE_QUERY_KEY(id),
      enabled: !!id,
      queryFn: () => repository().getById(id),
      staleTime: 60_000,
    }),
};

export const marketplaceMutations = {
  setStar: () =>
    mutationOptions({
      mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
        repository().setStar(id, starred),
      onSuccess: (pkg: MarketPackage) => {
        const queryClient = getQueryClient();
        queryClient.setQueryData(PACKAGE_QUERY_KEY(pkg.id), pkg);
        void queryClient.invalidateQueries({ queryKey: MARKETPLACE_QUERY_KEY(), exact: true });
      },
    }),
};
