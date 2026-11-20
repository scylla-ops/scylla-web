// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { DefaultMarketplaceRepository } from '../default-marketplace.repository.ts';

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
};

const repositoryOn = (storage = memoryStorage()) =>
  new DefaultMarketplaceRepository(() => storage);

describe('DefaultMarketplaceRepository', () => {
  it('lists the packages, each by its publisher and name', async () => {
    const packages = await repositoryOn().list();

    expect(packages.map(pkg => pkg.id)).toContain('kube-tools.helm-deploy');
    expect(packages.every(pkg => pkg.versions.length > 0)).toBe(true);
  });

  it('finds a package, or says that it does not exist', async () => {
    const repository = repositoryOn();

    expect((await repository.getById('pnpm.node-ci')).name).toBe('node-ci');
    await expect(repository.getById('pnpm.missing')).rejects.toThrow(ScyllaError);
  });

  it('counts the star of the reader, kept by the storage', async () => {
    const storage = memoryStorage();
    const before = await repositoryOn(storage).getById('pnpm.node-ci');

    await repositoryOn(storage).setStar('pnpm.node-ci', true);
    const starred = await repositoryOn(storage).getById('pnpm.node-ci');
    expect(starred).toEqual(expect.objectContaining({ starred: true, stars: before.stars + 1 }));

    const unstarred = await repositoryOn(storage).setStar('pnpm.node-ci', false);
    expect(unstarred).toEqual(expect.objectContaining({ starred: false, stars: before.stars }));
  });

  it('reads no star from an unreadable storage', async () => {
    const storage = memoryStorage();
    storage.setItem('scylla.marketplace-stars', '{not json');

    expect((await repositoryOn(storage).list()).some(pkg => pkg.starred)).toBe(false);
  });
});
