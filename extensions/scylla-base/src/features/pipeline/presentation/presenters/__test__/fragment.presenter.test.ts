import { describe, expect, it } from 'vitest';
import type {
  FragmentEntity,
  FragmentVersion,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { ExecPipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import {
  blockSummary,
  countInScope,
  filterFragments,
  firstProposal,
  isNewFragment,
  libraryTags,
  nodeCommandLine,
  nodesLine,
  sourceCounts,
  type FragmentFilter,
} from '../fragment.presenter.ts';

const execNode = (id: string): ExecPipelineNodeEntity => ({
  id,
  deps: [],
  kind: 'exec',
  command: 'cargo',
  args: [id, '--locked'],
  env: [],
});

const version = (number: number, publishedAt: string): FragmentVersion => ({
  number,
  nodes: [execNode('fmt'), execNode('clippy')],
  parameters: [{ key: 'REGISTRY_TOKEN', kind: 'secret' }],
  changes: [],
  author: { id: 'rem', name: 'Rem' },
  publishedAt,
});

const fragment = (overrides: Partial<FragmentEntity>): FragmentEntity => ({
  id: 'f1',
  workspaceId: 'acme',
  name: 'rust-ci',
  description: 'Lint and tests for Rust crates.',
  tags: ['rust', 'ci'],
  author: { id: 'rem', name: 'Rem' },
  versions: [version(1, '2026-10-01T10:00:00Z')],
  favorite: false,
  usages: [],
  ...overrides,
});

const usage = {
  pipelineId: 'p',
  pipelineName: 'api',
  projectId: 'pr',
  projectName: 'store',
  version: 1,
  values: {},
};

const PACKAGE = { packageId: 'pnpm.node-ci', publisher: 'pnpm', name: 'node-ci', verified: true };

/** Linked, with v2 of the publisher waiting. */
const linked = fragment({
  id: 'f2',
  name: 'node-ci',
  source: {
    kind: 'linked',
    package: PACKAGE,
    addedAt: '2026-10-01T10:00:00Z',
    upstream: [version(2, '2026-10-02T10:00:00Z')],
    skipped: [],
  },
});

const forked = fragment({
  id: 'f3',
  name: 'docker-build',
  source: {
    kind: 'forked',
    package: PACKAGE,
    addedAt: '2026-10-01T10:00:00Z',
    baseVersion: 1,
    upstream: null,
  },
});

const link = { blockId: 'rust-ci', fragmentId: 'f1', version: 1, values: {}, nodeIds: [] };

describe('fragment presenter', () => {
  it('shows the nodes of a block without the prefix of the block', () => {
    expect(nodesLine([execNode('rust-ci-fmt'), execNode('rust-ci-clippy')], 'rust-ci-')).toBe(
      'fmt · clippy',
    );
  });

  it('shows what a node runs on one line', () => {
    expect(nodeCommandLine(execNode('fmt'))).toBe('cargo fmt --locked');
    expect(
      nodeCommandLine({
        ...execNode('x'),
        kind: 'script',
        script: '\n  make lint\nmake test',
        shell: 'sh',
      }),
    ).toBe('make lint');
  });

  it('counts the secrets of a block that still need a value', () => {
    expect(blockSummary(link, [], fragment({})).missing).toBe(1);
    expect(
      blockSummary({ ...link, values: { REGISTRY_TOKEN: 'crates-io' } }, [], fragment({})).missing,
    ).toBe(0);
  });

  it('tells the first block that a newer version is proposed to', () => {
    const updated = fragment({
      versions: [version(1, '2026-10-01T10:00:00Z'), version(2, '2026-10-02T10:00:00Z')],
    });

    expect(firstProposal([link], () => updated)).toEqual(
      expect.objectContaining({ blockId: 'rust-ci' }),
    );
    expect(firstProposal([link], () => undefined)).toBeNull();
  });

  const ALL: FragmentFilter = { query: '', scope: 'all', tag: null, source: 'all', order: 'name' };

  it('searches the nodes and the tags, and keeps the favorites when asked', () => {
    const fragments = [
      fragment({}),
      fragment({ id: 'f2', name: 'node-ci', tags: ['node'], favorite: true }),
    ];

    expect(filterFragments(fragments, { ...ALL, query: 'clippy' })).toHaveLength(2);
    expect(filterFragments(fragments, { ...ALL, tag: 'rust' }).map(f => f.id)).toEqual(['f1']);
    expect(filterFragments(fragments, { ...ALL, scope: 'favorites' }).map(f => f.id)).toEqual([
      'f2',
    ]);
  });

  it('sorts by use, the most used first', () => {
    const fragments = [fragment({}), fragment({ id: 'f2', name: 'node-ci', usages: [usage] })];

    expect(filterFragments(fragments, { ...ALL, order: 'most-used' }).map(f => f.id)).toEqual([
      'f2',
      'f1',
    ]);
  });

  it('parts the fragments of the workspace from those of the marketplace', () => {
    const fragments = [fragment({}), linked, forked];

    expect(filterFragments(fragments, { ...ALL, scope: 'organization' }).map(f => f.id)).toEqual([
      'f1',
    ]);
    expect(filterFragments(fragments, { ...ALL, scope: 'community' }).map(f => f.id)).toEqual([
      'f3',
      'f2',
    ]);
    expect(countInScope(fragments, 'community')).toBe(2);
  });

  it('keeps the community fragments of a source, and those with a version waiting', () => {
    const fragments = [fragment({}), linked, forked];
    const community = { ...ALL, scope: 'community' as const };

    expect(filterFragments(fragments, { ...community, source: 'forked' }).map(f => f.id)).toEqual([
      'f3',
    ]);
    expect(filterFragments(fragments, { ...community, source: 'update' }).map(f => f.id)).toEqual([
      'f2',
    ]);
    expect(sourceCounts(fragments)).toEqual({ linked: 1, forked: 1, update: 1 });
  });

  it('lists the tags of the library, the most used first', () => {
    expect(libraryTags([fragment({}), fragment({ tags: ['ci'] })])).toEqual(['ci', 'rust']);
  });

  it('marks a fragment published this week with one version as new', () => {
    const now = new Date('2026-10-03T10:00:00Z').getTime();

    expect(isNewFragment(fragment({}), now)).toBe(true);
    expect(isNewFragment(fragment({}), now + 30 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});
