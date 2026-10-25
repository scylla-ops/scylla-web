import { activeLocale, t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import type {
  PipelineStep,
  StepDefinition,
} from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import {
  addStep,
  dependencyCandidates,
  dependentsOf,
  hasRepeats,
  removeStep,
  renameStep,
  setDependencies,
  updateStep,
} from '@base/features/pipeline/presentation/utils/pipeline-steps.ts';
import { createJobDrafts } from './job-drafts.svelte.ts';
import { createJobPanes } from './job-panes.svelte.ts';
import { jobRows, stepsAfterDrop } from './JobList/job-list.calculator.ts';
import { scriptingMessages } from './scripting.messages.ts';

export interface PipelineScriptingStateParams {
  /** Getters: the editor's document changes. */
  steps: () => PipelineStep[];
  /** The document parses: its jobs can be shown one by one. */
  isValid: () => boolean;
  onStepsChange: (steps: PipelineStep[]) => void;
}

/** One job at a time, or the whole document as text. */
export type ScriptingMode = 'jobs' | 'document';

const NEW_JOB_ID = 'job';
const NEW_JOB: StepDefinition = { kind: 'script', shell: 'bash', script: '', env: [] };

const sameDeps = (a: string[], b: string[]) =>
  a.length === b.length && a.every(dep => b.includes(dep));

/**
 * The scripting tab. The document stays the single source of truth: every edit of a job goes
 * back to it as steps, as the blueprint does. A document that does not parse has no jobs to
 * show: the tab shows the text, so that it can be fixed. So does a document with a repeated job id
 * or dependency: the views key the jobs by id.
 */
export const createPipelineScriptingState = (params: PipelineScriptingStateParams) => {
  let chosenMode = $state<ScriptingMode>('jobs');
  const canShowJobs = $derived(params.isValid() && !hasRepeats(params.steps()));
  const mode = $derived<ScriptingMode>(canShowJobs ? chosenMode : 'document');

  const panes = createJobPanes(() => jobRows(params.steps()).map(({ step }) => step.id));

  const stepOf = (id: string | null) => params.steps().find(step => step.id === id);

  const rename = (id: string, desired: string): string => {
    const change = renameStep(params.steps(), id, desired);
    if (change.id === id) return id;

    panes.rename(id, change.id);
    params.onStepsChange(change.steps);
    return change.id;
  };

  const drafts = createJobDrafts({
    onChange: (id, value) => params.onStepsChange(updateStep(params.steps(), id, value)),
    onRename: rename,
  });

  const focusedStep = $derived(stepOf(panes.focusedJob));

  // The document may have changed since: each job gets back only what still makes no loop.
  const restore = (previous: PipelineStep[]) => {
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
    get canShowJobs() {
      return canShowJobs;
    },
    get steps() {
      return params.steps();
    },
    panes,
    /** The job the properties panel shows: the one of the focused pane. */
    get focusedStep() {
      return focusedStep;
    },

    stepOf,
    /** The draft of a job, shared by all the views of the job. */
    draftOf(step: PipelineStep) {
      drafts.prune(params.steps().map(({ id }) => id));
      return drafts.of(step);
    },
    /** Releases the drafts: the view calls it when it goes away. */
    dispose: () => drafts.dispose(),

    /** Adds a job after the focused one, and opens it. */
    add() {
      const change = addStep(params.steps(), NEW_JOB_ID, NEW_JOB, panes.focusedJob ?? undefined);
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
     * Moves a job in the list (`stepsAfterDrop`). A move that removes dependencies says so, and
     * can be undone: the editor has no history.
     */
    moveJob(id: string, target: string | null, keep: boolean) {
      const before = params.steps();
      const index = before.findIndex(step => step.id === id);
      if (index === -1) return;

      const after = stepsAfterDrop(before, id, target, keep);
      const movedChanged = !sameDeps(before[index].deps, after[index].deps);
      // The other jobs that waited for the moved one and now wait for something else.
      const rewired = before.filter(
        (step, i) => i !== index && !sameDeps(step.deps, after[i].deps),
      );
      if (!movedChanged && rewired.length === 0) return;
      params.onStepsChange(after);

      const lost = before[index].deps.filter(dep => !after[index].deps.includes(dep));
      if (rewired.length === 0 && lost.length === 0) return;
      const message =
        target !== null && rewired.length > 0
          ? scriptingMessages.jobMoved(id, target)
          : scriptingMessages.dependenciesDropped(
              id,
              new Intl.ListFormat(activeLocale(), { type: 'unit' }).format(lost),
            );
      toast(t(message), {
        action: {
          label: t(scriptingMessages.undo),
          // The moved job first: it drops its new dependency before the others get theirs back.
          onClick: () => restore([before[index], ...rewired]),
        },
      });
    },

    dependentsOf: (id: string) => dependentsOf(params.steps(), id),
    dependencyCandidates: (id: string) => dependencyCandidates(params.steps(), id),
  };
};

export type PipelineScriptingState = ReturnType<typeof createPipelineScriptingState>;
