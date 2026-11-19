import { describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import type {
  FragmentLink,
  FragmentVersion,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type {
  ExecPipelineNodeEntity,
  PipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { START_NODE_ID } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
import { createBlueprint, type BlockContent } from '../blueprint.state.svelte.ts';

const execNode = (id: string, deps: string[] = []): ExecPipelineNodeEntity => ({
  id,
  deps,
  kind: 'exec',
  command: 'cargo',
  args: [id],
  env: [],
});

const version = (number: number): FragmentVersion => ({
  number,
  nodes: [execNode('fmt'), execNode('test', ['fmt'])],
  parameters: [{ key: 'REGISTRY_TOKEN', kind: 'secret' }],
  changes: [],
  author: { id: 'rem', name: 'Rem' },
  publishedAt: '2026-11-01T10:00:00Z',
});

const content = (number = 1): BlockContent => ({
  fragment: { id: 'f1', name: 'rust-ci' },
  version: version(number),
  values: { REGISTRY_TOKEN: 'crates-io' },
});

const withBlueprint = (
  initial: { nodes: PipelineNodeEntity[]; links?: FragmentLink[] },
  run: (
    blueprint: ReturnType<typeof createBlueprint>,
    changes: { nodes: ReturnType<typeof vi.fn>; links: ReturnType<typeof vi.fn> },
  ) => void,
) => {
  const changes = { nodes: vi.fn(), links: vi.fn() };
  const cleanup = $effect.root(() => {
    const blueprint = createBlueprint({
      nodes: () => initial.nodes,
      links: () => initial.links ?? [],
      pipelineName: () => 'api',
      onNodesChange: changes.nodes,
      onLinksChange: changes.links,
    });
    flushSync();
    run(blueprint, changes);
  });
  cleanup();
};

const lastCall = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0];

describe('createBlueprint: the blocks of the library', () => {
  it('adds a block whose nodes the document gets, prefixed with the block', () => {
    withBlueprint({ nodes: [execNode('build')] }, (blueprint, changes) => {
      const blockId = blueprint.addBlock(content(), { after: 'build' });

      expect(blockId).toBe('rust-ci');
      expect(
        (lastCall(changes.nodes) as PipelineNodeEntity[]).map(node => [node.id, node.deps]),
      ).toEqual([
        ['build', []],
        ['rust-ci-fmt', ['build']],
        ['rust-ci-test', ['rust-ci-fmt']],
      ]);
      expect(lastCall(changes.links)).toEqual([
        expect.objectContaining({
          blockId: 'rust-ci',
          fragmentId: 'f1',
          version: 1,
          nodeIds: ['rust-ci-fmt', 'rust-ci-test'],
        }),
      ]);
    });
  });

  it('gives a second block of the same fragment an id of its own', () => {
    withBlueprint({ nodes: [] }, blueprint => {
      blueprint.addBlock(content());

      expect(blueprint.addBlock(content())).not.toBe('rust-ci');
    });
  });

  it('puts one block in place of the selected nodes, wired as they were', () => {
    const nodes = [
      execNode('build'),
      execNode('fmt', ['build']),
      execNode('test', ['fmt']),
      execNode('deploy', ['test']),
    ];
    withBlueprint({ nodes }, blueprint => {
      blueprint.replaceWithBlock(['fmt', 'test'], content());

      const edges = blueprint.edges.map(edge => [edge.source, edge.target]);
      expect(edges).toContainEqual(['build', 'rust-ci']);
      expect(edges).toContainEqual(['rust-ci', 'deploy']);
      expect(blueprint.flowNodes.map(flowNode => flowNode.id).sort()).toEqual(
        [START_NODE_ID, 'build', 'deploy', 'rust-ci'].sort(),
      );
    });
  });

  it('takes another version of a block, and remembers a version that the pipeline skipped', () => {
    withBlueprint({ nodes: [] }, (blueprint, changes) => {
      const blockId = blueprint.addBlock(content(1));
      blueprint.updateBlock(blockId, content(1), 2);
      expect(lastCall(changes.links)).toEqual([
        expect.objectContaining({ version: 1, skippedVersion: 2 }),
      ]);

      blueprint.updateBlock(blockId, content(2));
      expect(lastCall(changes.links)).toEqual([expect.objectContaining({ version: 2 })]);
    });
  });

  it('keeps the nodes of a detached block, with no link', () => {
    withBlueprint({ nodes: [] }, (blueprint, changes) => {
      const blockId = blueprint.addBlock(content());
      blueprint.detachBlock(blockId);

      expect(lastCall(changes.links)).toEqual([]);
      expect((lastCall(changes.nodes) as PipelineNodeEntity[]).map(node => node.id)).toEqual([
        'rust-ci-fmt',
        'rust-ci-test',
      ]);
      expect(blueprint.flowNodes.map(flowNode => flowNode.id)).toContain('rust-ci-fmt');
    });
  });

  it('removes a block with its nodes', () => {
    withBlueprint({ nodes: [execNode('build')] }, (blueprint, changes) => {
      const blockId = blueprint.addBlock(content());
      blueprint.removeNode(blockId);

      expect((lastCall(changes.nodes) as PipelineNodeEntity[]).map(node => node.id)).toEqual([
        'build',
      ]);
      expect(lastCall(changes.links)).toEqual([]);
    });
  });
});
