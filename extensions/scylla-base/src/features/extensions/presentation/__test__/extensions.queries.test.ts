// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { setDependencyRegistry } from '@scylla/core-sdk';
import { runQueryFn } from '@test/queries.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { InstalledExtension } from '../../domain/structs/installed-extension.struct.ts';
import { EXTENSIONS_QUERY_KEY, extensionQueries } from '../extensions.queries.ts';

const extension: InstalledExtension = {
  id: 'scylla-base',
  name: 'Scylla',
  version: '0.4.0',
  dependencies: [],
  moduleCount: 15,
  pageCount: 20,
};

const withRepository = (getInstalledExtensions: ReturnType<typeof vi.fn>) =>
  setDependencyRegistry({ extensions: { extensionRepository: { getInstalledExtensions } } });

afterEach(() => setDependencyRegistry(null));

describe('extensionQueries.installed', () => {
  it('reads the extensions through the injected repository', async () => {
    withRepository(vi.fn().mockResolvedValue(ScyllaResult.success([extension])));

    await expect(runQueryFn(extensionQueries.installed())).resolves.toEqual([extension]);
  });

  it('lets a repository error through, for the query to own', async () => {
    const error = new ScyllaError('boom');
    withRepository(vi.fn().mockResolvedValue(ScyllaResult.error(error)));

    await expect(runQueryFn(extensionQueries.installed())).rejects.toBe(error);
  });

  it('caches under the key the factory publishes', () => {
    expect(extensionQueries.installed().queryKey).toEqual(EXTENSIONS_QUERY_KEY());
  });
});
