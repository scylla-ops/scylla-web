import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import { holdsLeave } from '@scylla/core-sdk';
import type { FragmentLink } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { createFragmentLinks } from '../fragment-links.state.svelte.ts';
import { createPipelineDocument } from '../pipeline-document.state.svelte.ts';
import { warnBeforeUnload } from '../unsaved-changes.effect.svelte.ts';
import { createUnsavedChanges } from '../unsaved-changes.state.svelte.ts';

const script = (id: string): PipelineNodeEntity => ({
  id,
  deps: [],
  env: [],
  kind: 'script',
  shell: 'sh',
  script: `echo ${id}`,
});

const saved = JSON.stringify({
  name: 'nightly',
  projectId: 'project-1',
  nodes: [{ id: 'welcome', deps: [], kind: 'script', shell: 'sh', script: 'echo welcome' }],
});

/** The fragment "greet" made from the node: its block takes the place of the node. */
const greet: FragmentLink = {
  blockId: 'greet',
  fragmentId: 'fragment-1',
  version: 1,
  values: {},
  nodeIds: ['greet-welcome'],
};

/** The editor as `PipelineEditor` wires it: the document, its links, and the guard of the leave. */
const withEditor = (
  run: (editor: {
    doc: ReturnType<typeof createPipelineDocument>;
    links: ReturnType<typeof createFragmentLinks>;
    changes: ReturnType<typeof createUnsavedChanges>;
    hold: ReturnType<typeof vi.fn>;
  }) => void,
) => {
  const hold = vi.fn();
  const cleanup = $effect.root(() => {
    const doc = createPipelineDocument({
      projectId: () => 'project-1',
      initialScript: () => saved,
    });
    const links = createFragmentLinks({ initial: () => [] });
    const changes = createUnsavedChanges(doc, links);
    warnBeforeUnload(() => changes.isDirty, hold);
    flushSync();
    run({ doc, links, changes, hold });
  });
  cleanup();
};

describe('createUnsavedChanges', () => {
  it('lets the user leave after a save of a new fragment block, also after a held leave', () => {
    withEditor(({ doc, links, changes, hold }) => {
      doc.setNodes([script('greet-welcome')]);
      links.set([greet]);
      flushSync();

      // The user tries to leave, and stays.
      expect(holdsLeave(vi.fn())).toBe(true);
      expect(hold).toHaveBeenCalledOnce();

      const done = changes.send();
      done();

      // The page leaves at once after the save, before the effects run again.
      expect(changes.isDirty).toBe(false);
      expect(holdsLeave(vi.fn())).toBe(false);
      flushSync();
      expect(holdsLeave(vi.fn())).toBe(false);
      expect(hold).toHaveBeenCalledOnce();
    });
  });

  it('keeps the leave held while the save has not succeeded', () => {
    withEditor(({ links, changes }) => {
      links.set([greet]);
      flushSync();

      changes.send();

      expect(changes.isDirty).toBe(true);
      expect(holdsLeave(vi.fn())).toBe(true);
    });
  });

  it('keeps a change made while the save was sent unsaved', () => {
    withEditor(({ doc, links, changes }) => {
      links.set([greet]);
      const done = changes.send();
      doc.setName('weekly');
      done();

      expect(changes.isDirty).toBe(true);
    });
  });

  it('counts a name that is typed and not applied yet', () => {
    withEditor(({ doc, changes }) => {
      changes.typeName('weekly');
      expect(changes.isDirty).toBe(true);

      changes.typeName('nightly ');
      expect(changes.isDirty).toBe(false);

      changes.typeName('weekly');
      doc.setName('weekly');
      changes.send()();
      expect(changes.isDirty).toBe(false);
    });
  });
});
