import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { createPipelineDocument } from '../pipeline-document.state.svelte.ts';

const withScript = (
  initialScript: string | undefined,
  run: (script: ReturnType<typeof createPipelineDocument>) => void,
) => {
  const cleanup = $effect.root(() => {
    const script = createPipelineDocument({
      projectId: () => 'project-1',
      initialScript: () => initialScript,
    });
    flushSync();
    run(script);
  });
  cleanup();
};

const document = JSON.stringify({
  name: 'nightly',
  nodes: [{ id: 'build', deps: [], kind: 'exec', command: 'make', args: [] }],
});

afterEach(() => vi.restoreAllMocks());

describe('createPipelineDocument', () => {
  it('starts from the initial script, clean', () => {
    withScript(document, script => {
      expect(script.script).toBe(document);
      expect(script.pipelineName).toBe('nightly');
      expect(script.nodes.map(node => node.id)).toEqual(['build']);
      expect(script.isValid).toBe(true);
      expect(script.isDirty).toBe(false);
    });
  });

  it('waits while the initial script is not loaded', () => {
    withScript(undefined, script => {
      expect(script.script).toBe('');
      expect(script.isValid).toBe(false);
    });
  });

  it('becomes dirty and reports a parse error for an invalid edit', () => {
    withScript(document, script => {
      script.setScript('{not json');
      flushSync();

      expect(script.isDirty).toBe(true);
      expect(script.isValid).toBe(false);
      expect(script.parseError).not.toBeNull();
    });
  });

  describe('when the fetched pipeline changes', () => {
    const named = (name: string) => JSON.stringify({ name, nodes: [] });

    /** Runs `edit`, then gives the document a new fetched version. */
    const refetched = (edit: (script: ReturnType<typeof createPipelineDocument>) => void) => {
      let initial = $state(named('before'));
      const seen = { script: '', isDirty: false };
      const cleanup = $effect.root(() => {
        const script = createPipelineDocument({
          projectId: () => 'project-1',
          initialScript: () => initial,
        });
        flushSync();
        edit(script);
        flushSync();
        initial = named('after');
        flushSync();
        seen.script = script.script;
        seen.isDirty = script.isDirty;
      });
      cleanup();
      return seen;
    };

    it('keeps an unsaved edit, still dirty', () => {
      const seen = refetched(script => script.setScript(named('mine')));

      expect(seen).toEqual({ script: named('mine'), isDirty: true });
    });

    it('follows the new version when nothing was edited', () => {
      const seen = refetched(() => {});

      expect(seen).toEqual({ script: named('after'), isDirty: false });
    });
  });

  it('writes new nodes and a new name into the document', () => {
    withScript(document, script => {
      script.setNodes([
        { id: 'test', deps: [], kind: 'script', script: 'make test', shell: 'sh', env: [] },
      ]);
      script.setName('weekly');
      flushSync();

      expect(script.pipelineName).toBe('weekly');
      expect(script.nodes.map(node => node.id)).toEqual(['test']);
    });
  });
});
