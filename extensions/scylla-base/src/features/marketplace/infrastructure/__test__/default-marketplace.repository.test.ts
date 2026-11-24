// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { failedCall, unaryCall } from '@test/grpc.ts';
import type { IMarketplaceServiceClient } from '@base/generated/scylla/marketplace/v1/marketplace_service.client.ts';
import { PackageCategory, type Package } from '@base/generated/scylla/marketplace/v1/package.ts';
import { FragmentVersion } from '@base/generated/scylla/library/v1/fragment.ts';
import { DefaultMarketplaceRepository } from '../default-marketplace.repository.ts';

const content = (number: number) =>
  FragmentVersion.toBinary(
    FragmentVersion.create({ number, changes: [`Release ${number}`], nodes: [], parameters: [] }),
  );

const pkg = (id: string, contents: number[]): Package => ({
  id: { value: id },
  publisher: 'acme',
  name: 'build',
  description: 'Builds',
  license: 'MIT',
  category: PackageCategory.BUILD,
  tags: ['rust'],
  versions: [1, 2].map(number => ({
    number,
    deprecated: number === 1,
    content: contents.includes(number) ? content(number) : new Uint8Array(),
  })),
  verified: false,
  stars: 3,
  starred: true,
});

const repositoryWith = (client: object) =>
  new DefaultMarketplaceRepository(client as unknown as IMarketplaceServiceClient);

describe('DefaultMarketplaceRepository', () => {
  it('reads every page, with the content of the versions that the list gives', async () => {
    const listPackages = vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { packages: [pkg('a', [2])], page: { nextToken: 'n' } }
          : { packages: [pkg('b', [2])], page: { nextToken: '' } },
      ),
    );

    const list = await repositoryWith({ listPackages }).list();

    expect(listPackages).toHaveBeenCalledTimes(2);
    expect(list.map(item => item.id)).toEqual(['a', 'b']);
    expect(list[0].versions.map(version => version.number)).toEqual([2]);
  });

  it('gives each public version, the deprecated ones and the publisher as their author', async () => {
    const getPackage = vi.fn(() => unaryCall({ package: pkg('a', [1, 2]) }));

    const read = await repositoryWith({ getPackage }).getById('a');

    expect(read.versions.map(version => version.number)).toEqual([1, 2]);
    expect(read.deprecated).toEqual([1]);
    expect(read.versions[1].author.name).toBe('acme');
    expect(read).toMatchObject({ category: 'build', stars: 3, starred: true });
  });

  it('passes a refusal of the server through', async () => {
    const getPackage = vi.fn(() => failedCall('NOT_FOUND'));

    await expect(repositoryWith({ getPackage }).getById('x')).rejects.toBeDefined();
  });
});
