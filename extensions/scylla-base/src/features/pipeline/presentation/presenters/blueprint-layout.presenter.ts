import type { XYPosition } from '@xyflow/svelte';
import { stepDepths } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { NODE_WIDTH } from './blueprint-geometry.presenter.ts';
import type { PipelineStepEntity } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';

const NODE_HEIGHT = 112;
const HORIZONTAL_GAP = 72;
const VERTICAL_GAP = 40;
const START_NODE_OFFSET = NODE_WIDTH + HORIZONTAL_GAP;

export interface BlueprintLayout {
  start: XYPosition;
  steps: Map<string, XYPosition>;
}

/**
 * One column per stage (`stepDepths`), the steps of a stage one below the other in the order of
 * the document, and the start node in the middle of the highest column.
 */
export const layoutSteps = (steps: PipelineStepEntity[]): BlueprintLayout => {
  const depths = stepDepths(steps);

  const columns = new Map<number, PipelineStepEntity[]>();
  for (const step of steps) {
    const depth = depths.get(step.id) ?? 0;
    columns.set(depth, [...(columns.get(depth) ?? []), step]);
  }

  const highest = Math.max(1, ...Array.from(columns.values()).map(column => column.length));
  const totalHeight = highest * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP;

  const positions = new Map<string, XYPosition>();
  for (const [depth, column] of columns) {
    column.forEach((step, row) =>
      positions.set(step.id, {
        x: START_NODE_OFFSET + depth * (NODE_WIDTH + HORIZONTAL_GAP),
        y: row * (NODE_HEIGHT + VERTICAL_GAP),
      }),
    );
  }

  return { start: { x: 0, y: totalHeight / 2 - NODE_HEIGHT / 2 }, steps: positions };
};

/** Next to the node it follows, else right of the graph: where a new node lands. */
export const positionAfter = (
  nodes: readonly { id: string; position: XYPosition }[],
  sourceId?: string,
): XYPosition => {
  const source =
    nodes.find(node => node.id === sourceId) ??
    nodes.reduce<(typeof nodes)[number] | undefined>(
      (best, node) => (!best || node.position.x > best.position.x ? node : best),
      undefined,
    );
  return source
    ? { x: source.position.x + NODE_WIDTH + HORIZONTAL_GAP, y: source.position.y }
    : { x: 0, y: 0 };
};
