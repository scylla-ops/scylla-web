// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { FragmentLink } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import { DefaultFragmentRepository } from '../default-fragment.repository.ts';

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
};

const repositoryOn = (storage = memoryStorage()) => new DefaultFragmentRepository(() => storage);

const author = { id: 'u1', name: 'Rem' };

const input = {
  workspaceId: 'acme',
  name: 'lint-all',
  description: 'Lints the repository.',
  tags: ['ci'],
  nodes: [
    { id: 'lint', deps: [], kind: 'exec' as const, command: 'make', args: ['lint'], env: [] },
  ],
  parameters: [],
  author,
  sourcePipeline: 'api-backend',
};

const pipeline = {
  pipelineId: 'p1',
  pipelineName: 'api',
  projectId: 'pr1',
  projectName: 'storefront',
};

describe('DefaultFragmentRepository', () => {
  it('gives each workspace the demo library once', async () => {
    const repository = repositoryOn();

    const first = await repository.list('acme');
    const again = await repository.list('acme');

    expect(first.length).toBeGreaterThan(0);
    expect(again.map(fragment => fragment.id)).toEqual(first.map(fragment => fragment.id));
    expect(await repository.list('globex')).not.toContainEqual(
      expect.objectContaining({ id: first[0].id }),
    );
  });

  it('saves a fragment as its version 1, kept by the storage', async () => {
    const storage = memoryStorage();
    const created = await repositoryOn(storage).create(input);

    const stored = await repositoryOn(storage).getById('acme', created.id);

    expect(stored.versions.map(version => version.number)).toEqual([1]);
    expect(stored.versions[0].changes).toEqual(['First version, saved from api-backend.']);
  });

  it('refuses a second fragment of the same name in the workspace', async () => {
    const repository = repositoryOn();
    await repository.create(input);

    await expect(repository.create(input)).rejects.toThrow(ScyllaError);
  });

  it('publishes the next version after the latest one', async () => {
    const repository = repositoryOn();
    const created = await repository.create(input);

    const published = await repository.publishVersion({
      id: created.id,
      nodes: input.nodes,
      parameters: [],
      changes: ['Faster.'],
      author,
    });

    expect(published.versions.map(version => version.number)).toEqual([1, 2]);
  });

  it('counts a pipeline that links a fragment in its usages, until its links are removed', async () => {
    const repository = repositoryOn();
    const created = await repository.create(input);
    const link: FragmentLink = {
      blockId: 'lint-all',
      fragmentId: created.id,
      version: 1,
      values: {},
      nodeIds: [],
    };

    await repository.saveLinks(pipeline, [link]);
    expect((await repository.getById('acme', created.id)).usages).toEqual([
      { ...pipeline, version: 1 },
    ]);
    expect(await repository.linksOf('p1')).toEqual([link]);

    await repository.saveLinks(pipeline, []);
    expect((await repository.getById('acme', created.id)).usages).toEqual([]);
  });

  it('keeps the favorites of the reader', async () => {
    const repository = repositoryOn();
    const created = await repository.create(input);

    await repository.setFavorite(created.id, true);
    expect((await repository.getById('acme', created.id)).favorite).toBe(true);

    await repository.setFavorite(created.id, false);
    expect((await repository.getById('acme', created.id)).favorite).toBe(false);
  });

  it('starts again from an empty library when the storage holds something unreadable', async () => {
    const storage = memoryStorage();
    storage.setItem('scylla.fragment-library', '{not json');

    await expect(repositoryOn(storage).linksOf('p1')).resolves.toEqual([]);
  });
});
