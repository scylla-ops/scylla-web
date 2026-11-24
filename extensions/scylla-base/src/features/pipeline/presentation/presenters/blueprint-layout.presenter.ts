import type { XYPosition } from '@xyflow/svelte';
import { nodeDepths } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { NODE_WIDTH, PORT_ROW_HEIGHT } from './blueprint-geometry.presenter.ts';
import {
  portsOf,
  type PipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

const NODE_HEIGHT = 112;
const HORIZONTAL_GAP = 72;
const VERTICAL_GAP = 40;
const START_NODE_OFFSET = NODE_WIDTH + HORIZONTAL_GAP;

export interface BlueprintLayout {
  start: XYPosition;
  nodes: Map<string, XYPosition>;
}

/** A switch draws one row for each port: past two, it is taller than the cell. */
const heightOf = (node: PipelineNodeEntity) =>
  NODE_HEIGHT +
  (node.kind === 'switch' ? Math.max(0, portsOf(node).length - 2) * PORT_ROW_HEIGHT : 0);

/** Where a node waits for a port of a switch: the place of that port. -1 for no such need. */
const portRank = (node: PipelineNodeEntity, byId: Map<string, PipelineNodeEntity>): number => {
  for (const { node: id, port } of node.deps) {
    const source = byId.get(id);
    if (source?.kind === 'switch' && port !== undefined) return portsOf(source).indexOf(port);
  }
  return -1;
};

/** The targets of the switches take their places in the order of the ports; the other nodes keep theirs. */
const inPortOrder = (
  column: PipelineNodeEntity[],
  byId: Map<string, PipelineNodeEntity>,
): PipelineNodeEntity[] => {
  const ranks = column.map(node => portRank(node, byId));
  const slots = column.flatMap((_, index) => (ranks[index] >= 0 ? [index] : []));
  const targets = [...slots].sort((a, b) => ranks[a] - ranks[b]).map(index => column[index]);
  const ordered = [...column];
  slots.forEach((slot, index) => (ordered[slot] = targets[index]));
  return ordered;
};

/**
 * One column per stage (`nodeDepths`), the nodes of a stage one below the other in the order of
 * the document (the targets of a switch in the order of its ports), and the start node in the
 * middle of the highest column.
 */
export const layoutNodes = (nodes: PipelineNodeEntity[]): BlueprintLayout => {
  const depths = nodeDepths(nodes);
  const byId = new Map(nodes.map(node => [node.id, node]));

  const columns = new Map<number, PipelineNodeEntity[]>();
  for (const node of nodes) {
    const depth = depths.get(node.id) ?? 0;
    columns.set(depth, [...(columns.get(depth) ?? []), node]);
  }

  const positions = new Map<string, XYPosition>();
  let totalHeight = NODE_HEIGHT;
  for (const [depth, column] of columns) {
    let y = 0;
    for (const node of inPortOrder(column, byId)) {
      positions.set(node.id, { x: START_NODE_OFFSET + depth * (NODE_WIDTH + HORIZONTAL_GAP), y });
      y += heightOf(node) + VERTICAL_GAP;
    }
    totalHeight = Math.max(totalHeight, y - VERTICAL_GAP);
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
