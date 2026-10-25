import type { PipelineIdentity } from '../structs/pipeline.struct.ts';
import type { PipelineIssue } from '../structs/pipeline-issue.struct.ts';
import { pipelineNameIssue } from '../structs/pipeline-name.struct.ts';
import { stepIdIssue, type StepId } from '../structs/step-id.struct.ts';
import {
  withDefinition,
  withDependencies,
  withoutDependency,
  withRenamedReference,
  type PipelineStepEntity,
  type StepDefinition,
} from './pipeline-step.entity.ts';

/**
 * The root of its steps: each step waits for the steps of its `deps`, and the operations below
 * keep that graph whole. A rename or a removal follows into the dependencies of the others.
 */
export interface PipelineEntity extends PipelineIdentity {
  nodes: PipelineStepEntity[];
}

/** The steps of a pipeline: what the operations on its graph take and give back. */
export type PipelineSteps = PipelineEntity['nodes'];

/** The steps after an operation, and the id the step really got. */
export interface StepsChange {
  steps: PipelineSteps;
  id: StepId;
}

/** The first reason the pipeline cannot be saved, or `null`. The server refuses the whole pipeline for one step id. */
export const pipelineIssue = ({
  name,
  nodes,
}: Pick<PipelineEntity, 'name' | 'nodes'>): PipelineIssue | null => {
  const nameIssue = pipelineNameIssue(name);
  if (nameIssue) return { kind: 'name', issue: nameIssue };

  const ids = nodes.filter(step => stepIdIssue(step.id)).map(step => step.id);
  return ids.length ? { kind: 'step-ids', ids } : null;
};

/** `excludeId` is the step's own id when it is renamed. */
export function uniqueStepId(
  desired: string,
  existingIds: Set<StepId>,
  excludeId?: StepId,
): StepId {
  const ids = new Set(existingIds);
  if (excludeId) ids.delete(excludeId);
  if (!ids.has(desired)) return desired;
  let i = 1;
  while (ids.has(`${desired}_${i}`)) i++;
  return `${desired}_${i}`;
}

const idsOf = (steps: PipelineSteps) => new Set(steps.map(step => step.id));

/** A repeated id or a repeated dependency: the steps cannot be keyed by id. */
export const hasRepeats = (steps: PipelineSteps): boolean =>
  idsOf(steps).size < steps.length ||
  steps.some(step => new Set(step.deps).size < step.deps.length);

/** Adds a step at the end. A taken id gets a suffix; `after` is the step it waits for. */
export const addStep = (
  steps: PipelineSteps,
  desiredId: string,
  definition: StepDefinition,
  after?: StepId,
): StepsChange => {
  const id = uniqueStepId(desiredId.trim() || 'step', idsOf(steps));
  const deps = after && steps.some(step => step.id === after) ? [after] : [];
  return { steps: [...steps, { id, deps, ...definition }], id };
};

export const updateStep = (
  steps: PipelineSteps,
  id: StepId,
  definition: StepDefinition,
): PipelineSteps => steps.map(step => (step.id === id ? withDefinition(step, definition) : step));

/**
 * Renames a step, and the dependencies on it. An empty id keeps the old one, a taken id gets a
 * suffix: the step stays usable.
 */
export const renameStep = (steps: PipelineSteps, id: StepId, desired: string): StepsChange => {
  const trimmed = desired.trim();
  if (!trimmed || trimmed === id || !steps.some(step => step.id === id)) return { steps, id };

  const next = uniqueStepId(trimmed, idsOf(steps), id);
  return { steps: steps.map(step => withRenamedReference(step, id, next)), id: next };
};

/** Removes a step, and the dependencies on it. */
export const removeStep = (steps: PipelineSteps, id: StepId): PipelineSteps =>
  steps.filter(step => step.id !== id).map(step => withoutDependency(step, id));

export const setDependencies = (steps: PipelineSteps, id: StepId, deps: StepId[]): PipelineSteps =>
  steps.map(step => (step.id === id ? withDependencies(step, deps) : step));

/** The steps that wait for this one. */
export const dependentsOf = (steps: PipelineSteps, id: StepId): StepId[] =>
  steps.filter(step => step.deps.includes(id)).map(step => step.id);

/** The steps this one can wait for: not itself, and none that waits for it, or the graph loops. */
export const dependencyCandidates = (steps: PipelineSteps, id: StepId): StepId[] =>
  steps.filter(step => step.id !== id && !waitsFor(steps, step.id, id)).map(step => step.id);

/**
 * How many steps run before each one, on the longest path: its column. A missing step adds no
 * column. A loop, which only a document typed by hand can hold, is cut where it closes,
 * so the walk ends.
 */
export function stepDepths(steps: PipelineSteps): Map<StepId, number> {
  const byId = new Map(steps.map(step => [step.id, step]));
  const depths = new Map<StepId, number>();
  const onPath = new Set<StepId>();

  const depthOf = (step: PipelineStepEntity): number => {
    const known = depths.get(step.id);
    if (known !== undefined) return known;

    onPath.add(step.id);
    let depth = 0;
    for (const dep of step.deps) {
      const parent = byId.get(dep);
      if (parent && !onPath.has(dep)) depth = Math.max(depth, depthOf(parent) + 1);
    }
    onPath.delete(step.id);

    depths.set(step.id, depth);
    return depth;
  };

  for (const step of steps) depthOf(step);
  return depths;
}

/** True when `id` waits for `other`, directly or through other steps. */
export const waitsFor = (steps: PipelineSteps, id: StepId, other: StepId): boolean => {
  const depsOf = new Map(steps.map(step => [step.id, step.deps]));
  const seen = new Set<StepId>();
  const pending = [...(depsOf.get(id) ?? [])];

  while (pending.length) {
    const next = pending.pop()!;
    if (next === other) return true;
    if (seen.has(next)) continue;
    seen.add(next);
    pending.push(...(depsOf.get(next) ?? []));
  }
  return false;
};
