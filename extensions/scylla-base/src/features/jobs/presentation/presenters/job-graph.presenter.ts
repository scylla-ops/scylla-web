import type { Edge, Node, XYPosition } from '@xyflow/svelte';
import type {
  JobEntity,
  JobNode,
  JobNodeExecution,
} from '@base/features/jobs/domain/entities/job.entity.ts';
import {
  ERROR_PORT,
  jobPath,
  needKey,
  type NeedState,
  type SkipReason,
} from './job-path.presenter.ts';

/** The node of the graph: a row with its state and its id, then a row for each named port. */
export const JOB_NODE = { width: 176, height: 36, portRow: 16 } as const;
const COLUMN_GAP = 56;
const ROW_GAP = 20;

/** A source handle: no port, a port of a switch (`chosen` when it opened), or `error`. */
export interface JobNodeOutput {
  port?: string;
  error?: true;
  chosen?: boolean;
}

export type JobGraphNodeData = {
  node: JobNode;
  execution?: JobNodeExecution;
  /** Why the node did not run, when it was skipped. */
  reason?: SkipReason;
  outputs: JobNodeOutput[];
};

export type JobFlowNode = Node<JobGraphNodeData, 'jobNode'>;

/** A switch shows each port; a node that runs a step shows `error` when a need names it. */
const outputsOf = (
  node: JobNode,
  execution: JobNodeExecution | undefined,
  errorUsed: boolean,
): JobNodeOutput[] => {
  if (node.kind === 'switch')
    return node.ports.map(port => ({ port, chosen: !!execution?.ports.includes(port) }));
  return node.kind === 'run' && errorUsed ? [{}, { port: ERROR_PORT, error: true }] : [{}];
};

/** The named ports are rows under the head of the node. */
export const jobNodeHeight = (outputs: JobNodeOutput[]) =>
  JOB_NODE.height + outputs.filter(output => output.port).length * JOB_NODE.portRow;

/** How many nodes run before each one, on the longest path. A loop is cut where it closes. */
const depthsOf = (nodes: JobNode[]): Map<string, number> => {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const depths = new Map<string, number>();
  const onPath = new Set<string>();
  const depthOf = (node: JobNode): number => {
    const known = depths.get(node.id);
    if (known !== undefined) return known;
    onPath.add(node.id);
    let depth = 0;
    for (const { node: id } of node.deps) {
      const parent = byId.get(id);
      if (parent && !onPath.has(id)) depth = Math.max(depth, depthOf(parent) + 1);
    }
    onPath.delete(node.id);
    depths.set(node.id, depth);
    return depth;
  };
  for (const node of nodes) depthOf(node);
  return depths;
};

/** Where a node waits for a port of a switch: the place of that port. -1 for no such need. */
const portRank = (node: JobNode, byId: Map<string, JobNode>): number => {
  for (const { node: id, port } of node.deps) {
    const source = byId.get(id);
    if (source?.kind === 'switch' && port !== undefined) return source.ports.indexOf(port);
  }
  return -1;
};

/**
 * The automatic layout of the editor: one column for each stage, the nodes of a stage one below
 * the other in the order of the snapshot, the targets of a switch in the order of its ports.
 */
const layout = (nodes: JobNode[], heights: Map<string, number>): Map<string, XYPosition> => {
  const depths = depthsOf(nodes);
  const byId = new Map(nodes.map(node => [node.id, node]));
  const columns = new Map<number, JobNode[]>();
  for (const node of nodes) {
    const depth = depths.get(node.id) ?? 0;
    columns.set(depth, [...(columns.get(depth) ?? []), node]);
  }

  const positions = new Map<string, XYPosition>();
  for (const [depth, column] of columns) {
    const ranks = column.map(node => portRank(node, byId));
    const slots = column.flatMap((_, index) => (ranks[index] >= 0 ? [index] : []));
    const targets = [...slots].sort((a, b) => ranks[a] - ranks[b]).map(index => column[index]);
    const ordered = [...column];
    slots.forEach((slot, index) => (ordered[slot] = targets[index]));

    let y = 0;
    for (const node of ordered) {
      positions.set(node.id, { x: depth * (JOB_NODE.width + COLUMN_GAP), y });
      y += (heights.get(node.id) ?? JOB_NODE.height) + ROW_GAP;
    }
  }
  return positions;
};

/** An open need is solid; a closed one is grey and dashed; one that waits is light. */
const EDGE_STYLES: Record<NeedState, string> = {
  open: 'stroke: var(--foreground); stroke-opacity: 0.6; stroke-width: 1.5;',
  closed:
    'stroke: var(--muted-foreground); stroke-opacity: 0.45; stroke-width: 1.5; stroke-dasharray: 5 4;',
  waiting: 'stroke: var(--input); stroke-width: 1.5;',
};

/** The graph of the job: its nodes in the state of their last run, and the path that it took. */
export const jobGraph = (job: JobEntity): { nodes: JobFlowNode[]; edges: Edge[] } => {
  const path = jobPath(job.nodes, job.nodeExecutions);
  const executions = new Map(job.nodeExecutions.map(execution => [execution.id, execution]));
  const ids = new Set(job.nodes.map(node => node.id));
  const errorUsed = new Set(
    job.nodes.flatMap(node =>
      node.deps.filter(dep => dep.port === ERROR_PORT).map(dep => dep.node),
    ),
  );

  const data = job.nodes.map(
    (node): JobGraphNodeData => ({
      node,
      execution: executions.get(node.id),
      reason: path.skipped.get(node.id),
      outputs: outputsOf(node, executions.get(node.id), errorUsed.has(node.id)),
    }),
  );
  const heights = new Map(data.map(({ node, outputs }) => [node.id, jobNodeHeight(outputs)]));
  const positions = layout(job.nodes, heights);

  return {
    // The known size: the view fits the graph at the load, before xyflow measures the nodes.
    nodes: data.map(entry => ({
      id: entry.node.id,
      type: 'jobNode',
      position: positions.get(entry.node.id) ?? { x: 0, y: 0 },
      initialWidth: JOB_NODE.width,
      initialHeight: heights.get(entry.node.id),
      data: entry,
    })),
    edges: job.nodes.flatMap(node =>
      node.deps
        .filter(need => need.node !== node.id && ids.has(need.node))
        .map(need => {
          const state = path.needs.get(needKey(node.id, need)) ?? 'waiting';
          const error = need.port === ERROR_PORT && state === 'open';
          return {
            id: needKey(node.id, need),
            source: need.node,
            target: node.id,
            ...(need.port ? { sourceHandle: need.port } : {}),
            type: 'smoothstep',
            data: { state },
            style: error ? 'stroke: var(--destructive); stroke-width: 1.5;' : EDGE_STYLES[state],
          };
        }),
    ),
  };
};
