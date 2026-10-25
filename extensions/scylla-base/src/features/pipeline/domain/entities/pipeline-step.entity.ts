import type { EnvEntry, Shell } from '../structs/pipeline.struct.ts';
import type { StepIssue } from '../structs/pipeline-issue.struct.ts';
import type { StepId } from '../structs/step-id.struct.ts';

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

export const stepIssue = (definition: StepDefinition): StepIssue | null => {
  if (definition.kind === 'exec') return definition.command.trim() ? null : 'missing-command';
  return definition.script.trim() ? null : 'empty-script';
};

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
