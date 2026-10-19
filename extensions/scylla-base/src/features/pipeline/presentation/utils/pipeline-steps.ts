import type {
  PipelineStep,
  StepDefinition,
} from '@base/features/pipeline/domain/structs/pipeline.struct.ts';

/** The steps after an operation, and the id the step really got. */
export interface StepsChange {
  steps: PipelineStep[];
  id: string;
}

/** `exclude` is the node's own id when renaming it. */
export function generateUniqueNodeId(
  desired: string,
  existingIds: Set<string>,
  excludeId?: string,
): string {
  const ids = new Set(existingIds);
  if (excludeId) ids.delete(excludeId);
  if (!ids.has(desired)) return desired;
  let i = 1;
  while (ids.has(`${desired}_${i}`)) i++;
  return `${desired}_${i}`;
}

const idsOf = (steps: PipelineStep[]) => new Set(steps.map(step => step.id));

/** Adds a step at the end. A taken id gets a suffix; `after` is the step it waits for. */
export const addStep = (
  steps: PipelineStep[],
  desiredId: string,
  definition: StepDefinition,
  after?: string,
): StepsChange => {
  const id = generateUniqueNodeId(desiredId.trim() || 'step', idsOf(steps));
  const deps = after && steps.some(step => step.id === after) ? [after] : [];
  return { steps: [...steps, { id, deps, ...definition }], id };
};

/** Replaces what the step runs; its id and its dependencies stay. */
export const updateStep = (
  steps: PipelineStep[],
  id: string,
  definition: StepDefinition,
): PipelineStep[] =>
  steps.map(step => (step.id === id ? { id, deps: step.deps, ...definition } : step));

/**
 * Renames a step, and the dependencies on it. An empty id keeps the old one, a taken id gets a
 * suffix: the step stays usable.
 */
export const renameStep = (steps: PipelineStep[], id: string, desired: string): StepsChange => {
  const trimmed = desired.trim();
  if (!trimmed || trimmed === id || !steps.some(step => step.id === id)) return { steps, id };

  const next = generateUniqueNodeId(trimmed, idsOf(steps), id);
  return {
    steps: steps.map(step => ({
      ...step,
      id: step.id === id ? next : step.id,
      deps: step.deps.map(dep => (dep === id ? next : dep)),
    })),
    id: next,
  };
};

/** Removes a step, and the dependencies on it. */
export const removeStep = (steps: PipelineStep[], id: string): PipelineStep[] =>
  steps
    .filter(step => step.id !== id)
    .map(step =>
      step.deps.includes(id) ? { ...step, deps: step.deps.filter(dep => dep !== id) } : step,
    );

export const setDependencies = (
  steps: PipelineStep[],
  id: string,
  deps: string[],
): PipelineStep[] => steps.map(step => (step.id === id ? { ...step, deps } : step));

/** The steps that wait for this one. */
export const dependentsOf = (steps: PipelineStep[], id: string): string[] =>
  steps.filter(step => step.deps.includes(id)).map(step => step.id);

/** The steps this one can wait for: not itself, and none that waits for it, or the graph loops. */
export const dependencyCandidates = (steps: PipelineStep[], id: string): string[] =>
  steps.filter(step => step.id !== id && !waitsFor(steps, step.id, id)).map(step => step.id);

/**
 * How many steps run before each one, on the longest path: its column. A missing step adds no
 * column. A loop, which only a document typed by hand can hold, is cut where it closes,
 * so the walk ends.
 */
export function stepDepths(steps: PipelineStep[]): Map<string, number> {
  const byId = new Map(steps.map(step => [step.id, step]));
  const depths = new Map<string, number>();
  const onPath = new Set<string>();

  const depthOf = (step: PipelineStep): number => {
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
export const waitsFor = (steps: PipelineStep[], id: string, other: string): boolean => {
  const depsOf = new Map(steps.map(step => [step.id, step.deps]));
  const seen = new Set<string>();
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
