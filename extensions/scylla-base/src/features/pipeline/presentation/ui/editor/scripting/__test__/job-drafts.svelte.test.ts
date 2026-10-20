import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import type * as StepDraftModule from '@base/features/pipeline/presentation/ui/editor/step/step-draft.svelte.ts';
import { createJobDrafts } from '../job-drafts.svelte.ts';

const released = vi.hoisted(() => ({ ids: [] as string[] }));

// A draft owns no effect: this one runs its cleanup when the draft's root is disposed.
vi.mock('@base/features/pipeline/presentation/ui/editor/step/step-draft.svelte.ts', async load => {
  const actual = await load<typeof StepDraftModule>();
  return {
    ...actual,
    createStepDraft: (params: Parameters<typeof actual.createStepDraft>[0]) => {
      $effect(() => () => void released.ids.push(params.step.id));
      return actual.createStepDraft(params);
    },
  };
});

const build: PipelineStep = {
  id: 'build',
  deps: [],
  kind: 'script',
  shell: 'bash',
  script: 'make',
  env: [],
};

const withDrafts = (
  run: (drafts: ReturnType<typeof createJobDrafts>, onChange: ReturnType<typeof vi.fn>) => void,
  onRename: (id: string, desired: string) => string = (_, desired) => desired,
) => {
  const onChange = vi.fn();
  const cleanup = $effect.root(() => {
    run(createJobDrafts({ onChange, onRename }), onChange);
    flushSync();
  });
  cleanup();
};

describe('createJobDrafts', () => {
  beforeEach(() => {
    released.ids.length = 0;
  });

  it('gives every view of a job the same draft', () => {
    withDrafts(drafts => {
      expect(drafts.of(build)).toBe(drafts.of({ ...build }));
    });
  });

  it('keeps the draft when the document reads back its own edit', () => {
    withDrafts((drafts, onChange) => {
      const draft = drafts.of(build);
      draft.script = 'make all';

      expect(onChange).toHaveBeenCalledWith(
        'build',
        expect.objectContaining({ script: 'make all' }),
      );
      expect(drafts.of({ ...build, script: 'make all' })).toBe(draft);
    });
  });

  it('builds a new draft when the document changed the job from elsewhere', () => {
    withDrafts(drafts => {
      const draft = drafts.of(build);
      const changed = drafts.of({ ...build, script: 'make test' });

      expect(changed).not.toBe(draft);
      expect(changed.script).toBe('make test');
    });
  });

  it('keeps the draft under the id that the rename gave', () => {
    withDrafts(
      (drafts, onChange) => {
        const draft = drafts.of(build);
        draft.id = 'compile';
        draft.rename();
        draft.script = 'make all';

        expect(draft.id).toBe('compile_1');
        expect(drafts.of({ ...build, id: 'compile_1', script: 'make all' })).toBe(draft);
        expect(onChange).toHaveBeenLastCalledWith('compile_1', expect.anything());
      },
      (_, desired) => `${desired}_1`,
    );
  });

  it('keeps a draft live after the component that asked for it first is gone', () => {
    withDrafts((drafts, onChange) => {
      let draft!: ReturnType<typeof drafts.of>;
      // A pane mounted, read the draft, then unmounted (a rename remounts it).
      const destroyPane = $effect.root(() => {
        draft = drafts.of(build);
        void draft.value;
      });
      destroyPane();

      draft.script = 'make all';
      expect(onChange).toHaveBeenLastCalledWith(
        'build',
        expect.objectContaining({ script: 'make all' }),
      );
    });
  });

  it('drops and disposes the draft of a job that left the document', () => {
    withDrafts(drafts => {
      const draft = drafts.of(build);
      drafts.of({ ...build, id: 'test' });
      flushSync();

      drafts.prune(['test']);
      expect(released.ids).toEqual(['build']);

      expect(drafts.of(build)).not.toBe(draft);
    });
  });

  it('releases every draft on dispose', () => {
    withDrafts(drafts => {
      drafts.of(build);
      drafts.of({ ...build, id: 'test' });
      flushSync();

      drafts.dispose();
      expect([...released.ids].sort()).toEqual(['build', 'test']);
    });
  });
});
