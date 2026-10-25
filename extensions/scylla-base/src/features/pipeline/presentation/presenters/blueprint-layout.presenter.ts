import type { XYPosition } from '@xyflow/svelte';
import { nodeDepths } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { NODE_WIDTH } from './blueprint-geometry.presenter.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

const NODE_HEIGHT = 112;
const HORIZONTAL_GAP = 72;
const VERTICAL_GAP = 40;
const START_NODE_OFFSET = NODE_WIDTH + HORIZONTAL_GAP;

export interface BlueprintLayout {
  start: XYPosition;
  nodes: Map<string, XYPosition>;
}

/**
 * One column per stage (`nodeDepths`), the nodes of a stage one below the other in the order of
 * the document, and the start node in the middle of the highest column.
 */
export const layoutNodes = (nodes: PipelineNodeEntity[]): BlueprintLayout => {
  const depths = nodeDepths(nodes);

  const columns = new Map<number, PipelineNodeEntity[]>();
  for (const node of nodes) {
    const depth = depths.get(node.id) ?? 0;
    columns.set(depth, [...(columns.get(depth) ?? []), node]);
  }

  const highest = Math.max(1, ...Array.from(columns.values()).map(column => column.length));
  const totalHeight = highest * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP;

  const positions = new Map<string, XYPosition>();
  for (const [depth, column] of columns) {
    column.forEach((node, row) =>
      positions.set(node.id, {
        x: START_NODE_OFFSET + depth * (NODE_WIDTH + HORIZONTAL_GAP),
        y: row * (NODE_HEIGHT + VERTICAL_GAP),
      }),
    );
  }

  return { start: { x: 0, y: totalHeight / 2 - NODE_HEIGHT / 2 }, nodes: positions };
};

/** Next to the node it follows, else right of the graph: where a new node lands. */
export const positionAfter = (
  flowNodes: readonly { id: string; position: XYPosition }[],
  sourceId?: string,
): XYPosition => {
  const source =
    flowNodes.find(flowNode => flowNode.id === sourceId) ??
    flowNodes.reduce<(typeof flowNodes)[number] | undefined>(
      (best, flowNode) => (!best || flowNode.position.x > best.position.x ? flowNode : best),
      undefined,
    );
  return source
    ? { x: source.position.x + NODE_WIDTH + HORIZONTAL_GAP, y: source.position.y }
    : { x: 0, y: 0 };
};
