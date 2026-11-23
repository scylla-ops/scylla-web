import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { withQueryClient } from '@test/render.ts';
import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { NodeDefinition } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { createFragmentEdit } from './fragment-edit.state.svelte.ts';

const REM = { id: 'rem', name: 'Rem' };
const SCRIPT: NodeDefinition = { kind: 'script', shell: 'sh', script: 'npm test', env: [] };

const fragment = {
  id: 'f1',
  versions: [
    {
      number: 1,
      nodes: [{ id: 'install', deps: [], kind: 'script', shell: 'sh', script: 'npm ci', env: [] }],
      parameters: [],
      changes: [],
      author: REM,
      publishedAt: '2026-11-01T10:00:00Z',
    },
  ],
} as unknown as FragmentEntity;

const withEdit = (run: (edit: ReturnType<typeof createFragmentEdit>) => void) => {
  const cleanup = $effect.root(() => {
    const edit = createFragmentEdit({ fragment: () => fragment, author: () => REM, editable: () => true });
    flushSync();
    run(edit);
  });
  cleanup();
};

let cache: ReturnType<typeof withQueryClient>;
beforeEach(() => (cache = withQueryClient()));
afterEach(() => cache.restore());

describe('createFragmentEdit: a link pulled from a node', () => {
  it('adds a node that waits for the node of the link, and opens it', () => {
    withEdit(edit => {
      const id = edit.add('test', SCRIPT, { node: 'install' });
      flushSync();
      expect(edit.nodes.map(node => [node.id, node.deps])).toEqual([
        ['install', []],
        ['test', [{ node: 'install' }]],
      ]);
      expect(edit.selected?.id).toBe(id);
      expect(edit.dirty).toBe(true);
    });
  });

  it('keeps the port of the link, such as the error port', () => {
    withEdit(edit => {
      edit.add('notify', SCRIPT, { node: 'install', port: 'error' });
      flushSync();
      expect(edit.nodes.at(-1)?.deps).toEqual([{ node: 'install', port: 'error' }]);
    });
  });

  it('gives a free id when the name is taken', () => {
    withEdit(edit => {
      expect(edit.add('install', SCRIPT, { node: 'install' })).not.toBe('install');
    });
  });
});

describe('createFragmentEdit: the ports of a switch', () => {
  it('moves the needs on a renamed case, and drops the needs on a case that goes', () => {
    withEdit(edit => {
      edit.add('sw', { kind: 'merge' }, { node: 'install' });
      edit.add('deploy', SCRIPT, { node: 'sw', port: 'true' });
      edit.add('notify', SCRIPT, { node: 'sw', port: 'false' });
      flushSync();
      const sw = edit.nodes.find(node => node.id === 'sw')!;
      const definition = { kind: sw.kind } as NodeDefinition;

      edit.update('sw', definition, { from: 'true', to: 'yes' });
      edit.update('sw', definition, { from: 'false', to: null });
      flushSync();

      const deps = (id: string) => edit.nodes.find(node => node.id === id)?.deps;
      expect(deps('deploy')).toEqual([{ node: 'sw', port: 'yes' }]);
      expect(deps('notify')).toEqual([]);
    });
  });
});
