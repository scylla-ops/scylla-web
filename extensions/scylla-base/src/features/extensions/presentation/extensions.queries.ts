import { getModuleDomain, queryOptions } from '@scylla/core-sdk';
import type { ExtensionsModule } from '../extensions.module.ts';

const repository = () =>
  getModuleDomain<typeof ExtensionsModule.domain>('extensions').extensionRepository;

export const EXTENSIONS_QUERY_KEY = () => ['extensions', 'installed'] as const;

export const extensionQueries = {
  installed: () =>
    queryOptions({
      queryKey: EXTENSIONS_QUERY_KEY(),
      queryFn: async () => (await repository().getInstalledExtensions()).unwrap(),
      // The loaded extensions do not change while the app runs.
      staleTime: Infinity,
    }),
};
