import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';

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
