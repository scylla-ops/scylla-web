import type { Connection, XYPosition } from '@xyflow/svelte';
import type { PipelineStep, StepDefinition } from '../domain/structs/pipeline.struct.ts';
import {
  NODE_WIDTH,
  START_NODE_ID,
  definitionOf,
  depsOf,
  edgeBetween,
  flowToSteps,
  generateUniqueNodeId,
  stepOf,
  stepsToFlow,
  type BlueprintEdge,
  type BlueprintNode,
  type BlueprintStepNode,
} from './utils/blueprint-converter.ts';

export interface BlueprintStateParams {
  /** Getters: the editor's document changes. */
  steps: () => PipelineStep[];
  pipelineName: () => string;
  onStepsChange: (steps: PipelineStep[]) => void;
}

/** How a new step joins the graph: after a node (by default the start node), or inside an edge. */
export type StepLink = { after?: string } | { replacing: string };

export type StepPlacement = StepLink & { position?: XYPosition };

const COLUMN_GAP = 72;

/**
 * The canvas graph, in step with the script. The script owns the steps, the
 * canvas owns the positions, so the graph cannot be derived from the steps.
 * `lastEmitted` recognises the echo of our own edits, or one edit would loop.
 * `@xyflow/svelte` writes added and deleted elements itself: `sync` publishes them.
 */
export const createBlueprintState = (params: BlueprintStateParams) => {
  // `$state.raw`: replaced whole, never mutated.
  let nodes = $state.raw<BlueprintNode[]>([]);
  let edges = $state.raw<BlueprintEdge[]>([]);

  let lastEmitted = '';

  const keyOf = (steps: PipelineStep[], name: string) => JSON.stringify({ steps, name });

  const emit = () => {
    const steps = flowToSteps(nodes, edges);
    const key = keyOf(steps, params.pipelineName());
    if (key === lastEmitted) return;

    lastEmitted = key;
    params.onStepsChange(steps);
  };

  // Writes only `nodes` and `edges`, so it never re-triggers itself.
  $effect(() => {
    const steps = params.steps();
    const name = params.pipelineName();
    if (keyOf(steps, name) === lastEmitted) return;

    const flow = stepsToFlow(steps, name);
    nodes = flow.nodes;
    edges = flow.edges;

    lastEmitted = keyOf(flow.sanitizedSteps, name);
    // Sanitising (renamed duplicate id, dropped dangling dependency) must go back up.
    if (JSON.stringify(flow.sanitizedSteps) !== JSON.stringify(steps)) {
      params.onStepsChange(flow.sanitizedSteps);
    }
  });

  /** The inspector edits one node: several selected nodes show the palette instead. */
  const selected = $derived.by(() => {
    const picked = nodes.filter(node => node.selected);
    return picked.length === 1 ? picked[0] : undefined;
  });

  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to a call, never state
  const idsOf = () => new Set(nodes.map(node => node.id));

  /** Next to the node it follows, else right of the graph. */
  const positionAfter = (sourceId?: string): XYPosition => {
    const source = nodes.find(node => node.id === sourceId);
    if (source) return { x: source.position.x + NODE_WIDTH + COLUMN_GAP, y: source.position.y };

    const rightmost = nodes.reduce<BlueprintNode | undefined>(
      (best, node) => (!best || node.position.x > best.position.x ? node : best),
      undefined,
    );
    return rightmost
      ? { x: rightmost.position.x + NODE_WIDTH + COLUMN_GAP, y: rightmost.position.y }
      : { x: 0, y: 0 };
  };

  /** A rename is followed in the `deps` of the other steps and in the edges. */
  const editNode = (originalId: string, newNodeId: string, value: StepDefinition): string => {
    const id = generateUniqueNodeId(newNodeId, idsOf(), originalId);

    nodes = nodes.map((node): BlueprintNode => {
      // The start node is the pipeline, not a step.
      if (node.type !== 'pipelineStep') return node;

      if (node.id === originalId) {
        return { ...node, id, data: { step: { id, deps: [], ...value } } };
      }

      const deps = node.data.step.deps;
      if (!deps.includes(originalId)) return node;

      return {
        ...node,
        data: {
          step: { ...node.data.step, deps: deps.map(dep => (dep === originalId ? id : dep)) },
        },
      };
    });

    if (originalId !== id) {
      edges = edges.map(edge => {
        if (edge.source !== originalId && edge.target !== originalId) return edge;

        const source = edge.source === originalId ? id : edge.source;
        const target = edge.target === originalId ? id : edge.target;
        return { ...edge, id: `${source}->${target}`, source, target };
      });
    }

    emit();
    return id;
  };

  const stepById = (id: string) => {
    const node = nodes.find(candidate => candidate.id === id);
    return node ? stepOf(node) : undefined;
  };

  return {
    get nodes() {
      return nodes;
    },
    set nodes(next: BlueprintNode[]) {
      nodes = next;
    },
    get edges() {
      return edges;
    },
    set edges(next: BlueprintEdge[]) {
      edges = next;
    },
    get selected() {
      return selected;
    },

    /** Nothing may depend on the start node: it is the pipeline itself. */
    canConnect: (connection: Connection) => connection.target !== START_NODE_ID,

    sync: emit,

    /** The ids of the steps this one waits for: the inspector lists them. */
    dependenciesOf: (id: string) => depsOf(edges, id),

    /** Adds the step, selected so that the inspector opens on it. Returns its final id. */
    addNode(nodeId: string, value: StepDefinition, placement: StepPlacement = {}): string {
      const id = generateUniqueNodeId(nodeId.trim() || 'step', idsOf());
      const replaced =
        'replacing' in placement ? edges.find(edge => edge.id === placement.replacing) : undefined;
      const after = 'after' in placement ? placement.after : undefined;
      const source = replaced?.source ?? after ?? START_NODE_ID;

      const node: BlueprintStepNode = {
        id,
        type: 'pipelineStep',
        position: placement.position ?? positionAfter(replaced?.source ?? after),
        selected: true,
        data: { step: { id, deps: [], ...value } },
      };

      nodes = [
        ...nodes.map(other => (other.selected ? { ...other, selected: false } : other)),
        node,
      ];
      edges = [
        ...edges.filter(edge => edge !== replaced),
        edgeBetween(source, id),
        ...(replaced ? [edgeBetween(id, replaced.target)] : []),
      ];

      emit();
      return id;
    },

    updateStep(id: string, value: StepDefinition) {
      editNode(id, id, value);
    },

    /** A taken or empty id keeps the step usable: it gets a suffix, or keeps its id. */
    renameStep(id: string, desired: string): string {
      const step = stepById(id);
      const next = desired.trim();
      if (!step || !next || next === id) return id;
      return editNode(id, next, definitionOf(step));
    },

    removeStep(id: string) {
      if (id === START_NODE_ID) return;
      nodes = nodes.filter(node => node.id !== id);
      edges = edges.filter(edge => edge.source !== id && edge.target !== id);
      emit();
    },

    select(id: string | null) {
      nodes = nodes.map(node =>
        Boolean(node.selected) === (node.id === id) ? node : { ...node, selected: node.id === id },
      );
    },

    /** Lays the graph out again by depth: the same layout as a freshly opened pipeline. */
    arrange() {
      const flow = stepsToFlow(flowToSteps(nodes, edges), params.pipelineName());
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to this call, never state
      const positions = new Map(flow.nodes.map(node => [node.id, node.position]));
      nodes = nodes.map(node => ({ ...node, position: positions.get(node.id) ?? node.position }));
    },
  };
};

export type BlueprintState = ReturnType<typeof createBlueprintState>;
