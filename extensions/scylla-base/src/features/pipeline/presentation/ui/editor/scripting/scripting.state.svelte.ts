import type {
  PipelineStep,
  StepDefinition,
} from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import {
  addStep,
  dependencyCandidates,
  dependentsOf,
  removeStep,
  renameStep,
  setDependencies,
  updateStep,
} from '@base/features/pipeline/presentation/utils/pipeline-steps.ts';
import { createJobDrafts } from './job-drafts.svelte.ts';
import { createJobPanes } from './job-panes.svelte.ts';

export interface ScriptingStateParams {
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
 * show: the tab shows the text, so that it can be fixed.
 */
export const createScriptingState = (params: ScriptingStateParams) => {
  let chosenMode = $state<ScriptingMode>('jobs');
  const mode = $derived<ScriptingMode>(params.isValid() ? chosenMode : 'document');

  const panes = createJobPanes(() => params.steps().map(step => step.id));

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
      return params.isValid();
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
    draftOf: (step: PipelineStep) => drafts.of(step),

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
      params.onStepsChange(setDependencies(params.steps(), id, deps));
    },

    dependentsOf: (id: string) => dependentsOf(params.steps(), id),
    dependencyCandidates: (id: string) => dependencyCandidates(params.steps(), id),
  };
};

export type ScriptingState = ReturnType<typeof createScriptingState>;
