import type {
  PipelineStep,
  StepDefinition,
} from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { definitionOf } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
import {
  createStepDraft,
  type StepDraft,
} from '@base/features/pipeline/presentation/ui/editor/step/step-draft.svelte.ts';

export interface StepDraftsParams {
  onChange: (id: string, value: StepDefinition) => void;
  /** Returns the id the step really got. */
  onRename: (id: string, desired: string) => string;
}

interface Entry {
  id: string;
  /** What the draft last wrote to the document, or read from it. */
  signature: string;
  draft: StepDraft;
  dispose: () => void;
}

// `definitionOf` puts the keys in one order: a step and the draft's value compare as text.
const signatureOf = (definition: StepDefinition) =>
  JSON.stringify(definitionOf({ id: '', deps: [], ...definition }));

/**
 * One draft per step, shared by every view of the step: the panes that show it and the properties
 * panel. Two drafts of one step would each write their own copy and undo the other's edits. A step
 * that the document changed from elsewhere (the full document, the blueprint) gets a new draft.
 */
export const createStepDrafts = ({ onChange, onRename }: StepDraftsParams) => {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a cache of drafts, never read as state
  const entries = new Map<string, Entry>();

  const build = (step: PipelineStep): Entry => {
    // The draft's callbacks read the entry, so the entry exists before the draft.
    const entry = { id: step.id, signature: signatureOf(step) } as Entry;
    // Its own root: the deriveds of a draft must outlive the component that asked for it first,
    // else they go stale when that component is mounted again (a new tab, a rename).
    entry.dispose = $effect.root(() => {
      entry.draft = createStepDraft({
        step,
        onChange: value => {
          entry.signature = signatureOf(value);
          onChange(entry.id, value);
        },
        onRename: desired => {
          const id = onRename(entry.id, desired);
          if (id !== entry.id) {
            entries.delete(entry.id);
            entry.id = id;
            entries.set(id, entry);
          }
          return id;
        },
      });
    });
    return entry;
  };

  return {
    /** Drops the drafts of the steps that left the document. */
    prune(ids: string[]) {
      for (const [id, entry] of entries) {
        if (ids.includes(id)) continue;
        entry.dispose();
        entries.delete(id);
      }
    },

    dispose() {
      for (const entry of entries.values()) entry.dispose();
      entries.clear();
    },

    of(step: PipelineStep): StepDraft {
      const kept = entries.get(step.id);
      if (kept?.signature === signatureOf(step)) return kept.draft;

      kept?.dispose();
      const entry = build(step);
      entries.set(step.id, entry);
      return entry.draft;
    },
  };
};
