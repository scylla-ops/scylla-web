import type { EnvEntry, Shell } from '../structs/step.struct.ts';
import { stepIdIssue, type StepId, type StepIdIssue } from '../structs/step-id.struct.ts';

interface PipelineStepBase {
  id: StepId;
  deps: StepId[];
  workingDir?: string;
  env: EnvEntry[];
}

export interface ExecPipelineStepEntity extends PipelineStepBase {
  kind: 'exec';
  command: string;
  args: string[];
}

export interface ScriptPipelineStepEntity extends PipelineStepBase {
  kind: 'script';
  script: string;
  shell: Shell;
}

/** A step of a pipeline. The pipeline keeps the ids unique and the dependencies whole. */
export type PipelineStepEntity = ExecPipelineStepEntity | ScriptPipelineStepEntity;

/** A step without its place in the graph: the pipeline owns `id` and `deps`. */
export type StepDefinition =
  | Omit<ExecPipelineStepEntity, 'id' | 'deps'>
  | Omit<ScriptPipelineStepEntity, 'id' | 'deps'>;

export const definitionOf = (step: PipelineStepEntity): StepDefinition => {
  const base = { workingDir: step.workingDir, env: step.env };
  return step.kind === 'script'
    ? { ...base, kind: 'script', script: step.script, shell: step.shell }
    : { ...base, kind: 'exec', command: step.command, args: step.args };
};

/** What stops a step from running. The node and the inspector both show it. */
export type StepIssue = 'missing-command' | 'empty-script';

export const stepIssue = (definition: StepDefinition): StepIssue | null => {
  if (definition.kind === 'exec') return definition.command.trim() ? null : 'missing-command';
  return definition.script.trim() ? null : 'empty-script';
};

/** Why the step cannot be saved or run: a refused id first, as the server rejects the whole pipeline. */
export type StepProblem = { kind: 'id'; issue: StepIdIssue } | { kind: 'run'; issue: StepIssue };

export const stepProblem = (step: PipelineStepEntity): StepProblem | null => {
  const idIssue = stepIdIssue(step.id);
  if (idIssue) return { kind: 'id', issue: idIssue };
  const issue = stepIssue(step);
  return issue ? { kind: 'run', issue } : null;
};

/** A step with nothing to run yet: the editor adds it, then the user writes its code. */
export const blankDefinition = (kind: PipelineStepEntity['kind'], shell: Shell = 'bash'): StepDefinition =>
  kind === 'script'
    ? { kind: 'script', shell, script: '', env: [] }
    : { kind: 'exec', command: '', args: [], env: [] };

/** Replaces what the step runs; its id and its dependencies stay. */
export const withDefinition = (
  step: PipelineStepEntity,
  definition: StepDefinition,
): PipelineStepEntity => ({ id: step.id, deps: step.deps, ...definition });

export const withDependencies = (step: PipelineStepEntity, deps: StepId[]): PipelineStepEntity => ({
  ...step,
  deps,
});

export const withoutDependency = (step: PipelineStepEntity, id: StepId): PipelineStepEntity =>
  step.deps.includes(id) ? { ...step, deps: step.deps.filter(dep => dep !== id) } : step;

/** The step after `from` is renamed `to`: its own id if it is `from`, and its dependency on it. */
export const withRenamedReference = (
  step: PipelineStepEntity,
  from: StepId,
  to: StepId,
): PipelineStepEntity => ({
  ...step,
  id: step.id === from ? to : step.id,
  deps: step.deps.map(dep => (dep === from ? to : dep)),
});
