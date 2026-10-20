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
import { jobRows } from './JobList/job-list.calculator.ts';

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

    dependentsOf: (id: string) => dependentsOf(params.steps(), id),
    dependencyCandidates: (id: string) => dependencyCandidates(params.steps(), id),
  };
};

export type PipelineScriptingState = ReturnType<typeof createPipelineScriptingState>;
