import { activeLocale, t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import {
  blankDefinition,
  type PipelineStepEntity,
} from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import { addStep, dependencyCandidates, dependentsOf, hasRepeats, moveStep, removeStep, renameStep, setDependencies, updateStep } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { createStepDrafts } from './step-drafts.state.svelte.ts';
import { createStepPanes } from './step-panes.state.svelte.ts';
import { stepRows } from '@base/features/pipeline/presentation/presenters/step-list.presenter.ts';
import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';

export interface PipelineScriptingParams {
  /** Getters: the editor's document changes. */
  steps: () => PipelineStepEntity[];
  /** The document parses: its steps can be shown one by one. */
  isValid: () => boolean;
  onStepsChange: (steps: PipelineStepEntity[]) => void;
}

/** One step at a time, or the whole document as text. */
export type ScriptingMode = 'steps' | 'document';

const NEW_STEP_ID = 'step';

const sameDeps = (a: string[], b: string[]) =>
  a.length === b.length && a.every(dep => b.includes(dep));

/**
 * The scripting tab. The document stays the single source of truth: every edit of a step goes
 * back to it as steps, as the blueprint does. A document that does not parse has no steps to
 * show: the tab shows the text, so that it can be fixed. So does a document with a repeated step id
 * or dependency: the views key the steps by id.
 */
export const createPipelineScripting = (params: PipelineScriptingParams) => {
  let chosenMode = $state<ScriptingMode>('steps');
  const canShowSteps = $derived(params.isValid() && !hasRepeats(params.steps()));
  const mode = $derived<ScriptingMode>(canShowSteps ? chosenMode : 'document');

  const panes = createStepPanes(() => stepRows(params.steps()).map(({ step }) => step.id));

  const stepOf = (id: string | null) => params.steps().find(step => step.id === id);

  const rename = (id: string, desired: string): string => {
    const change = renameStep(params.steps(), id, desired);
    if (change.id === id) return id;

    panes.rename(id, change.id);
    params.onStepsChange(change.steps);
    return change.id;
  };

  const drafts = createStepDrafts({
    onChange: (id, value) => params.onStepsChange(updateStep(params.steps(), id, value)),
    onRename: rename,
  });

  const focusedStep = $derived(stepOf(panes.focusedId));

  // The document may have changed since: each step gets back only what still makes no loop.
  const restore = (previous: PipelineStepEntity[]) => {
    let steps = params.steps();
    for (const { id, deps } of previous) {
      if (!steps.some(step => step.id === id)) continue;
      const candidates = dependencyCandidates(steps, id);
      steps = setDependencies(
        steps,
        id,
        deps.filter(dep => candidates.includes(dep)),
      );
    }
    params.onStepsChange(steps);
  };

  return {
    get mode() {
      return mode;
    },
    set mode(next: ScriptingMode) {
      chosenMode = next;
    },
    get canShowSteps() {
      return canShowSteps;
    },
    get steps() {
      return params.steps();
    },
    panes,
    /** The step the properties panel shows: the one of the focused pane. */
    get focusedStep() {
      return focusedStep;
    },

    stepOf,
    /** The draft of a step, shared by all the views of the step. */
    draftOf(step: PipelineStepEntity) {
      drafts.prune(params.steps().map(({ id }) => id));
      return drafts.of(step);
    },
    /** Releases the drafts: the view calls it when it goes away. */
    dispose: () => drafts.dispose(),

    /** Adds a step after the focused one, and opens it. */
    add() {
      const change = addStep(params.steps(), NEW_STEP_ID, blankDefinition('script'), panes.focusedId ?? undefined);
      params.onStepsChange(change.steps);
      panes.open(change.id);
    },

    remove(id: string) {
      params.onStepsChange(removeStep(params.steps(), id));
    },

    setDependencies(id: string, deps: string[]) {
      panes.pin();
      params.onStepsChange(setDependencies(params.steps(), id, deps));
    },

    /**
     * Moves a step in the list (`moveStep`). A move that removes dependencies says so, and
     * can be undone: the editor has no history.
     */
    moveStep(id: string, target: string | null, keep: boolean) {
      const before = params.steps();
      const index = before.findIndex(step => step.id === id);
      if (index === -1) return;

      const after = moveStep(before, id, target, keep);
      const movedChanged = !sameDeps(before[index].deps, after[index].deps);
      // The other steps that waited for the moved one and now wait for something else.
      const rewired = before.filter(
        (step, i) => i !== index && !sameDeps(step.deps, after[i].deps),
      );
      if (!movedChanged && rewired.length === 0) return;
      params.onStepsChange(after);

      const lost = before[index].deps.filter(dep => !after[index].deps.includes(dep));
      if (rewired.length === 0 && lost.length === 0) return;
      const message =
        target !== null && rewired.length > 0
          ? scriptingMessages.stepMoved(id, target)
          : scriptingMessages.dependenciesDropped(
              id,
              new Intl.ListFormat(activeLocale(), { type: 'unit' }).format(lost),
            );
      toast(t(message), {
        action: {
          label: t(scriptingMessages.undo),
          // The moved step first: it drops its new dependency before the others get theirs back.
          onClick: () => restore([before[index], ...rewired]),
        },
      });
    },

    dependentsOf: (id: string) => dependentsOf(params.steps(), id),
    dependencyCandidates: (id: string) => dependencyCandidates(params.steps(), id),
  };
};

export type PipelineScripting = ReturnType<typeof createPipelineScripting>;
