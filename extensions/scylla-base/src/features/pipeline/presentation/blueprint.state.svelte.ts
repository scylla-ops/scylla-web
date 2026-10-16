import { untrack } from 'svelte';
import type { Connection, XYPosition } from '@xyflow/svelte';
import type { PipelineStep } from '../domain/structs/pipeline.struct.ts';
import {
  HORIZONTAL_GAP,
  NODE_WIDTH,
  START_NODE_ID,
  dependentsOf,
  edgeBetween,
  flowToSteps,
  generateUniqueNodeId,
  stepOf,
  stepsToFlow,
  type BlueprintEdge,
  type BlueprintNode,
  type BlueprintStepNode,
  type NodeFormValue,
} from './utils/blueprint-converter.ts';
import { stepsKey } from './utils/pipeline-script.ts';

export interface BlueprintStateParams {
  /** Getters: the editor's document changes. */
  steps: () => PipelineStep[];
  pipelineName: () => string;
  onStepsChange: (steps: PipelineStep[]) => void;
}

/** Where a new step goes. Without a position, it is placed beside `after`, or after the last step. */
export interface StepPlacement {
  position?: XYPosition;
  /** The step it runs after. Without one, it runs first. */
  after?: string;
}

const ROW_HEIGHT = 140;

/**
 * The canvas graph, in step with the script. The script owns the steps, the
 * canvas owns the positions, so the graph cannot be derived from the steps.
 * `lastSteps` recognises the echo of our own edits, or one edit would loop.
 * `@xyflow/svelte` writes added and deleted elements itself: `sync` publishes them.
 */
export const createBlueprintState = (params: BlueprintStateParams) => {
  // `$state.raw`: replaced whole, never mutated.
  let nodes = $state.raw<BlueprintNode[]>([]);
  let edges = $state.raw<BlueprintEdge[]>([]);
  let selectedId = $state<string | null>(null);
  // Counts the rebuilds from the document: an open step panel starts again from the new step.
  let revision = $state(0);

  // The steps last sent or received, to recognise the echo of our own edits.
  let lastSteps = '';

  const emit = () => {
    const steps = flowToSteps(nodes, edges);
    const key = stepsKey(steps);
    if (key === lastSteps) return;

    lastSteps = key;
    params.onStepsChange(steps);
  };

  // Reads only the document: what it writes back is read under `untrack`, or it would loop.
  $effect(() => {
    const steps = params.steps();
    const name = params.pipelineName();

    untrack(() => {
      // A rename of the pipeline only relabels the start node: the layout stays.
      if (stepsKey(steps) === lastSteps) {
        if (nodes.some(node => node.type === 'startNode' && node.data.name !== name)) {
          nodes = nodes.map(node =>
            node.type === 'startNode' ? { ...node, data: { ...node.data, name } } : node,
          );
        }
        return;
      }

      const flow = stepsToFlow(steps, name);
      nodes = flow.nodes;
      edges = flow.edges;
      revision += 1;

      lastSteps = stepsKey(flow.sanitizedSteps);
      // Sanitising (renamed duplicate id, dropped dangling dependency) must go back up.
      if (lastSteps !== stepsKey(steps)) {
        params.onStepsChange(flow.sanitizedSteps);
      }
    });
  });

  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to a call, never state
  const takenIds = () => new Set(nodes.map(node => node.id));

  /** A root hangs off the start node on the canvas; a step with a dependency does not. */
  const withStartEdges = (next: BlueprintEdge[]): BlueprintEdge[] => {
    const dependents = next.filter(edge => edge.source !== START_NODE_ID).map(edge => edge.target);
    const kept = next.filter(
      edge => edge.source !== START_NODE_ID || !dependents.includes(edge.target),
    );
    const rooted = kept.filter(edge => edge.source === START_NODE_ID).map(edge => edge.target);
    const missing = nodes
      .filter(node => node.type === 'pipelineStep')
      .filter(node => !dependents.includes(node.id) && !rooted.includes(node.id))
      .map(node => edgeBetween(START_NODE_ID, node.id));
    return [...kept, ...missing];
  };

  const freePosition = (placement: StepPlacement): XYPosition => {
    const anchor = nodes.find(node => node.id === placement.after);
    const steps = nodes.filter(node => node.type === 'pipelineStep');
    const x = anchor
      ? anchor.position.x + NODE_WIDTH + HORIZONTAL_GAP
      : Math.max(0, ...nodes.map(node => node.position.x + NODE_WIDTH + HORIZONTAL_GAP));
    let y = anchor?.position.y ?? nodes.find(node => node.id === START_NODE_ID)?.position.y ?? 0;

    // One row down until the spot is free.
    while (
      steps.some(node => Math.abs(node.position.x - x) < 40 && Math.abs(node.position.y - y) < 40)
    ) {
      y += ROW_HEIGHT;
    }
    return { x, y };
  };

  /** The steps `stepId` may run after: not itself, not one that already runs after it. */
  const dependencyCandidates = (stepId: string): string[] => {
    const after = dependentsOf(stepId, edges);
    const current = edges.filter(edge => edge.target === stepId).map(edge => edge.source);
    return nodes
      .filter(node => node.type === 'pipelineStep')
      .map(node => node.id)
      .filter(id => id !== stepId && !after.has(id) && !current.includes(id));
  };

  const isStep = (id: string) => nodes.some(node => node.id === id && node.type === 'pipelineStep');

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
    get revision() {
      return revision;
    },

    /** The step or the start node the side panel shows. */
    get selectedId() {
      return selectedId !== null && nodes.some(node => node.id === selectedId) ? selectedId : null;
    },
    /** Also marks the node on the canvas, so the panel and the canvas agree. */
    select(id: string | null) {
      selectedId = id;
      nodes = nodes.map(node =>
        node.selected === (node.id === id) ? node : { ...node, selected: node.id === id },
      );
    },
    get selectedStep(): PipelineStep | undefined {
      const node = nodes.find(candidate => candidate.id === selectedId);
      if (!node) return undefined;
      const step = stepOf(node);
      if (!step) return undefined;
      // `deps` live on the edges.
      const deps = edges
        .filter(edge => edge.target === node.id && edge.source !== START_NODE_ID)
        .map(edge => edge.source);
      return { ...step, deps };
    },

    /** Nothing may depend on the start node, and no step may run after itself. */
    canConnect: (connection: Connection) =>
      connection.target !== START_NODE_ID &&
      connection.source !== connection.target &&
      !dependentsOf(connection.target, edges).has(connection.source),

    dependencyCandidates,

    sync() {
      edges = withStartEdges(edges);
      emit();
    },

    /** Adds a step, selects it and returns its id. */
    addStep(preferredId: string, value: NodeFormValue, placement: StepPlacement = {}): string {
      const id = generateUniqueNodeId(preferredId, takenIds());
      const after = placement.after && isStep(placement.after) ? placement.after : undefined;

      const node: BlueprintStepNode = {
        id,
        type: 'pipelineStep',
        position: placement.position ?? freePosition({ after }),
        data: { step: { id, deps: [], ...value } },
      };

      nodes = [
        ...nodes.map(other => (other.selected ? { ...other, selected: false } : other)),
        {
          ...node,
          selected: true,
        },
      ];
      edges = withStartEdges([...edges, ...(after ? [edgeBetween(after, id)] : [])]);
      selectedId = id;
      emit();
      return id;
    },

    /**
     * Replaces a step's content. A rename is followed in the edges, so the other
     * steps keep depending on it. Returns the id it ends up with.
     */
    updateStep(originalId: string, newNodeId: string, value: NodeFormValue): string {
      const id = generateUniqueNodeId(newNodeId, takenIds(), originalId);

      nodes = nodes.map((node): BlueprintNode => {
        // The start node is the pipeline, not a step.
        if (node.type !== 'pipelineStep' || node.id !== originalId) return node;
        return { ...node, id, data: { step: { id, deps: [], ...value } } };
      });

      if (originalId !== id) {
        edges = edges.map(edge => {
          if (edge.source !== originalId && edge.target !== originalId) return edge;
          const source = edge.source === originalId ? id : edge.source;
          const target = edge.target === originalId ? id : edge.target;
          return { ...edge, id: `${source}->${target}`, source, target };
        });
        if (selectedId === originalId) selectedId = id;
      }

      emit();
      return id;
    },

    removeStep(id: string) {
      nodes = nodes.filter(node => node.id !== id || node.type !== 'pipelineStep');
      edges = withStartEdges(edges.filter(edge => edge.source !== id && edge.target !== id));
      if (selectedId === id) selectedId = null;
      emit();
    },

    addDependency(stepId: string, dependencyId: string) {
      if (!dependencyCandidates(stepId).includes(dependencyId)) return;
      edges = withStartEdges([...edges, edgeBetween(dependencyId, stepId)]);
      emit();
    },

    removeDependency(stepId: string, dependencyId: string) {
      edges = withStartEdges(
        edges.filter(edge => edge.source !== dependencyId || edge.target !== stepId),
      );
      emit();
    },
  };
};

export type BlueprintState = ReturnType<typeof createBlueprintState>;
