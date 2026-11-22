// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { failedCall, unaryCall } from '@test/grpc.ts';
import type { IFragmentServiceClient } from '@base/generated/scylla/library/v1/fragment_service.client.ts';
import {
  FragmentVersion,
  ParameterKind,
  type Fragment,
} from '@base/generated/scylla/library/v1/fragment.ts';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import type { IMarketplaceServiceClient } from '@base/generated/scylla/marketplace/v1/marketplace_service.client.ts';
import { PackageCategory } from '@base/generated/scylla/marketplace/v1/package.ts';
import { DefaultFragmentRepository } from '../default-fragment.repository.ts';

const fragment = (id: string, workspace = 'w1'): Fragment => ({
  id: { value: id },
  workspaceId: { value: workspace },
  name: 'build',
  description: 'Builds',
  tags: ['ci'],
  author: { id: { value: 'u1' }, name: 'Ada' },
  versions: [
    {
      number: 1,
      nodes: [],
      parameters: [
        { key: 'MODE', kind: ParameterKind.LITERAL, defaultValue: 'release', description: '' },
        { key: 'TOKEN', kind: ParameterKind.SECRET, defaultValue: '', description: 'The token' },
      ],
      changes: [],
      author: { id: { value: 'u1' }, name: 'Ada' },
    },
  ],
  favorite: true,
  usages: [],
});

const repositoryWith = (
  client: object,
  pipelines: object = {},
  market: object = {},
  local = false,
) =>
  new DefaultFragmentRepository(
    client as unknown as IFragmentServiceClient,
    pipelines as unknown as IPipelineServiceClient,
    {
      client: market as unknown as IMarketplaceServiceClient,
      registry: 'https://market.test',
      local,
    },
  );

describe('DefaultFragmentRepository', () => {
  it('reads every page of the library', async () => {
    const listFragments = vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { fragments: [fragment('a')], page: { nextToken: 'n' } }
          : { fragments: [fragment('b')], page: { nextToken: '' } },
      ),
    );

    const list = await repositoryWith({ listFragments }).list('w1');

    expect(listFragments).toHaveBeenCalledTimes(2);
    expect(list.map(item => item.id)).toEqual(['a', 'b']);
  });

  it('maps a literal with its default and a secret with none', async () => {
    const getFragment = vi.fn(() => unaryCall({ fragment: fragment('a') }));

    const read = await repositoryWith({ getFragment }).getById('w1', 'a');

    expect(read.author).toEqual({ id: 'u1', name: 'Ada' });
    expect(read.favorite).toBe(true);
    expect(read.versions[0].parameters).toEqual([
      { key: 'MODE', kind: 'literal', default: 'release' },
      { key: 'TOKEN', kind: 'secret', description: 'The token' },
    ]);
  });

  it('gives NOT_FOUND for a fragment of another workspace', async () => {
    const getFragment = vi.fn(() => unaryCall({ fragment: fragment('a', 'w2') }));

    await expect(repositoryWith({ getFragment }).getById('w1', 'a')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('sends the parameters and never the author', async () => {
    const createFragment = vi.fn(() => unaryCall({ fragment: fragment('a') }));

    await repositoryWith({ createFragment }).create({
      workspaceId: 'w1',
      name: 'build',
      description: '',
      tags: [],
      nodes: [],
      parameters: [{ key: 'TOKEN', kind: 'secret' }],
      author: { id: 'u1', name: 'Ada' },
      sourcePipeline: 'ci',
    });

    expect(createFragment).toHaveBeenCalledWith({
      workspaceId: { value: 'w1' },
      name: 'build',
      description: '',
      tags: [],
      nodes: [],
      parameters: [{ key: 'TOKEN', kind: ParameterKind.SECRET, defaultValue: '', description: '' }],
    });
  });

  it('reads the links of a pipeline with the pipeline', async () => {
    const getPipeline = vi.fn(() =>
      unaryCall({
        pipeline: {
          fragmentLinks: [
            {
              blockId: 'ci',
              fragmentId: { value: 'a' },
              version: 2,
              values: { MODE: 'debug' },
              nodeIds: ['ci-build'],
            },
          ],
        },
      }),
    );

    const links = await repositoryWith({}, { getPipeline }).linksOf('p1');

    expect(links).toEqual([
      {
        blockId: 'ci',
        fragmentId: 'a',
        version: 2,
        values: { MODE: 'debug' },
        nodeIds: ['ci-build'],
      },
    ]);
  });

  it('passes a refusal of the server through', async () => {
    const deleteFragment = vi.fn(() => failedCall('PERMISSION_DENIED'));

    await expect(repositoryWith({ deleteFragment }).delete('a')).rejects.toBeDefined();
  });

  it('adds a package with its origin, at the number of the version of the package', async () => {
    const createFragment = vi.fn(() => unaryCall({ fragment: fragment('a') }));
    const version = {
      number: 4,
      nodes: [],
      parameters: [],
      changes: [],
      author: { id: '', name: 'acme' },
      publishedAt: '',
    };

    await repositoryWith({ createFragment }).addFromMarketplace({
      workspaceId: 'w1',
      mode: 'linked',
      name: 'shared',
      description: '',
      tags: [],
      package: { packageId: 'p1', publisher: 'acme', name: 'build', verified: false },
      version,
      newer: [],
      author: { id: 'u1', name: 'Ada' },
    });

    expect(createFragment).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: {
          registry: 'https://market.test',
          packageId: 'p1',
          packageName: '@acme/build',
          version: 4,
          linked: true,
        },
      }),
    );
  });

  it('shows the versions of the package after the latest one of a linked fragment', async () => {
    const linked = {
      ...fragment('a'),
      origin: {
        registry: 'https://market.test',
        packageId: 'p1',
        packageName: '@acme/build',
        linked: true,
        baseVersion: 1,
        skipped: [],
      },
    };
    const getFragment = vi.fn(() => unaryCall({ fragment: linked }));
    const getPackage = vi.fn(() =>
      unaryCall({
        package: {
          publisher: 'acme',
          category: PackageCategory.BUILD,
          versions: [1, 2].map(number => ({
            number,
            deprecated: false,
            content: FragmentVersion.toBinary(FragmentVersion.create({ number })),
          })),
        },
      }),
    );

    const read = await repositoryWith({ getFragment }, {}, { getPackage }).getById('w1', 'a');

    expect(read.source).toMatchObject({
      kind: 'linked',
      package: { packageId: 'p1', publisher: 'acme', name: 'build' },
    });
    expect(read.source?.kind === 'linked' && read.source.upstream.map(v => v.number)).toEqual([2]);
  });

  it('keeps the library when the marketplace does not answer', async () => {
    const listFragments = vi.fn(() =>
      unaryCall({ fragments: [fragment('a')], page: { nextToken: '' } }),
    );
    const listPublications = vi.fn(() => failedCall('UNIMPLEMENTED'));

    const list = await repositoryWith({ listFragments }, {}, { listPublications }, true).list('w1');

    expect(list.map(item => item.id)).toEqual(['a']);
    expect(list[0].publication).toBeUndefined();
  });
});
