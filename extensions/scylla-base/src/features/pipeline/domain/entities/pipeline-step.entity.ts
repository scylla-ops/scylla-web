import type { EnvEntry, Shell } from '../structs/pipeline.struct.ts';
import type { NodeIdIssue, StepIssue } from '../structs/pipeline-issue.struct.ts';

interface PipelineStepBase {
  id: string;
  deps: string[];
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

/** A step of a pipeline: its id is unique in the pipeline, and the other steps wait for it by id. */
export type PipelineStepEntity = ExecPipelineStepEntity | ScriptPipelineStepEntity;

/** A step without its place in the graph: the graph owns `id` and `deps`. */
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

/** The server's rule (`NodeIdRule` in scylla-domain): trimmed, 1 to 128 of `a-z`, `0-9`, `-`, `_`. */
export const NODE_ID_MAX_LENGTH = 128;

export const nodeIdIssue = (raw: string): NodeIdIssue | null => {
  const id = raw.trim();
  if (!id) return { kind: 'empty' };

  const characters = [...new Set([...id].filter(character => !/[a-z0-9_-]/.test(character)))];
  if (characters.length) return { kind: 'invalid-characters', characters };

  // Only ASCII is left: a character is a byte.
  return id.length > NODE_ID_MAX_LENGTH ? { kind: 'too-long', length: id.length } : null;
};

/** The nearest valid id: lowercase, accents dropped, any other run of characters a `-`. */
export const toNodeId = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, NODE_ID_MAX_LENGTH) || 'step';
