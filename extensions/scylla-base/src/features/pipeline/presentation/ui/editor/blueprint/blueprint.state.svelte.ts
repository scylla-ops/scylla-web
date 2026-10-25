import { untrack } from 'svelte';
import type { Connection, XYPosition } from '@xyflow/svelte';
import type { PipelineStepEntity, StepDefinition } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import * as pipeline from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { positionAfter } from '@base/features/pipeline/presentation/presenters/blueprint-layout.presenter.ts';
import {
  START_NODE_ID,
  depsOf,
  edgeBetween,
  flowToSteps,
  stepOf,
  stepsToFlow,
  type FlowEdge,
  type FlowNode,
  type PipelineFlowNode,
} from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';

export interface BlueprintParams {
  /** Getters: the editor's document changes. */
  steps: () => PipelineStepEntity[];
  pipelineName: () => string;
  onStepsChange: (steps: PipelineStepEntity[]) => void;
}

/** How a new step joins the graph: after a node (by default the start node), or inside an edge. */
export type StepLink = { after?: string } | { replacing: string };

export type StepPlacement = StepLink & { position?: XYPosition };

/**
 * The canvas graph, in step with the script. The script owns the steps, the
 * canvas owns the positions, so the graph cannot be derived from the steps.
 * `lastEmitted` recognises the echo of our own edits, or one edit would loop.
 * `@xyflow/svelte` writes added and deleted elements itself: `sync` publishes them.
 *
 * The side panel shows `inspected`, which a click opens and nothing else: the selection of the
 * canvas (a drag, a box, the delete key) never opens or closes it.
 */
export const createBlueprint = (params: BlueprintParams) => {
  // `$state.raw`: replaced whole, never mutated.
  let flowNodes = $state.raw<FlowNode[]>([]);
  let edges = $state.raw<FlowEdge[]>([]);
  let inspectedId = $state<string | null>(null);

  let lastEmitted = '';

  const keyOf = (steps: PipelineStepEntity[], name: string) => JSON.stringify({ steps, name });

  const emit = () => {
    if (readOnly) return;
    const steps = flowToSteps(flowNodes, edges);
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
    // A node that is still there keeps its place and its selection: only a new one is laid out.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to this run, never state
    const previous = new Map(untrack(() => flowNodes).map(flowNode => [flowNode.id, flowNode]));
    flowNodes = flow.flowNodes.map(flowNode => {
      const kept = previous.get(flowNode.id);
      return kept ? { ...flowNode, position: kept.position, selected: kept.selected } : flowNode;
    });
    edges = flow.edges;

    lastEmitted = keyOf(steps, name);
  });

  /**
   * Two steps share an id: the graph shows them, marked, but cannot edit them, as an edit goes
   * through the ids. The document is never rewritten to remove the repeat.
   */
  const readOnly = $derived(pipeline.repeatedStepIds(params.steps()).length > 0);

  const inspected = $derived(
    flowNodes.find((flowNode): flowNode is PipelineFlowNode => flowNode.id === inspectedId && !!stepOf(flowNode)),
  );

  const currentSteps = () => flowToSteps(flowNodes, edges);

  /**
   * Writes back what an operation of the pipeline changed in the steps. The edges are the
   * dependencies of the graph: a rename is followed in them too.
   */
  const applyToSteps = (next: PipelineStepEntity[], renamed?: { from: string; to: string }) => {
    if (readOnly) return;
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to a call, never state
    const byId = new Map(next.map(step => [step.id, step]));
    const follow = (id: string) => (renamed && id === renamed.from ? renamed.to : id);

    flowNodes = flowNodes.map((flowNode): FlowNode => {
      // The start node is the pipeline, not a step.
      if (flowNode.type !== 'pipelineStep') return flowNode;
      const id = follow(flowNode.id);
      const step = byId.get(id);
      return step ? { ...flowNode, id, data: { step } } : flowNode;
    });

    if (renamed) {
      if (inspectedId === renamed.from) inspectedId = renamed.to;
      edges = edges.map(edge => {
        if (edge.source !== renamed.from && edge.target !== renamed.from) return edge;
        const source = follow(edge.source);
        const target = follow(edge.target);
        return { ...edge, id: `${source}->${target}`, source, target };
      });
    }

    emit();
  };

  return {
    get flowNodes() {
      return flowNodes;
    },
    set flowNodes(next: FlowNode[]) {
      flowNodes = next;
    },
    get edges() {
      return edges;
    },
    set edges(next: FlowEdge[]) {
      edges = next;
    },
    /** The node the side panel shows. */
    get inspected() {
      return inspected;
    },
    get readOnly() {
      return readOnly;
    },

    /**
     * Nothing may depend on the start node, which is the pipeline itself, and no link may close a
     * loop: the source must not wait for the target already.
     */
    canConnect: ({ source, target }: Connection) =>
      !readOnly &&
      target !== START_NODE_ID &&
      source !== target &&
      !pipeline.waitsFor(currentSteps(), source, target),

    sync() {
      emit();
      // The canvas may have deleted the inspected node.
      if (!inspected) inspectedId = null;
    },

    /** A step no edge goes into: saving links it to the start node, so the canvas warns. */
    isDetached: (id: string) => !edges.some(edge => edge.target === id),

    /** The ids of the steps this one waits for: the inspector lists them. */
    dependenciesOf: (id: string) => depsOf(edges, id),

    /** Adds the step; the caller opens it with `inspect` when a click asked for it. Returns its final id. */
    addNode(desiredId: string, value: StepDefinition, placement: StepPlacement = {}): string {
      if (readOnly) return desiredId;
      const { id } = pipeline.addStep(currentSteps(), desiredId, value);
      const replaced =
        'replacing' in placement ? edges.find(edge => edge.id === placement.replacing) : undefined;
      const after = 'after' in placement ? placement.after : undefined;
      const source = replaced?.source ?? after ?? START_NODE_ID;

      const flowNode: PipelineFlowNode = {
        id,
        type: 'pipelineStep',
        position: placement.position ?? positionAfter(flowNodes, replaced?.source ?? after),
        data: { step: { id, deps: [], ...value } },
      };

      flowNodes = [...flowNodes, flowNode];
      edges = [
        ...edges.filter(edge => edge !== replaced),
        edgeBetween(source, id),
        ...(replaced ? [edgeBetween(id, replaced.target)] : []),
      ];

      emit();
      return id;
    },

    updateStep(id: string, value: StepDefinition) {
      applyToSteps(pipeline.updateStep(currentSteps(), id, value));
    },

    /** A taken or empty id keeps the step usable: it gets a suffix, or keeps its id. */
    renameStep(id: string, desired: string): string {
      const change = pipeline.renameStep(currentSteps(), id, desired);
      if (change.id !== id) applyToSteps(change.steps, { from: id, to: change.id });
      return change.id;
    },

    removeStep(id: string) {
      if (id === START_NODE_ID || readOnly) return;
      if (inspectedId === id) inspectedId = null;
      flowNodes = flowNodes.filter(flowNode => flowNode.id !== id);
      edges = edges.filter(edge => edge.source !== id && edge.target !== id);
      emit();
    },

    /**
     * Opens the side panel on a step, selected on the canvas; `null` closes it. The start node
     * is the pipeline: its name is edited in the header, so it closes the panel too.
     */
    inspect(id: string | null) {
      const next = id === START_NODE_ID || readOnly ? null : id;
      inspectedId = next;
      flowNodes = flowNodes.map(flowNode =>
        Boolean(flowNode.selected) === (flowNode.id === next) ? flowNode : { ...flowNode, selected: flowNode.id === next },
      );
    },

    /** Lays the graph out again by depth: the same layout as a freshly opened pipeline. */
    arrange() {
      const flow = stepsToFlow(flowToSteps(flowNodes, edges), params.pipelineName());
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to this call, never state
      const positions = new Map(flow.flowNodes.map(flowNode => [flowNode.id, flowNode.position]));
      flowNodes = flowNodes.map(flowNode => ({ ...flowNode, position: positions.get(flowNode.id) ?? flowNode.position }));
    },
  };
};

export type Blueprint = ReturnType<typeof createBlueprint>;
