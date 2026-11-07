import { untrack } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import type { Connection, XYPosition } from '@xyflow/svelte';
import { activeLocale, t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import {
  definitionOf,
  runsStep,
  type PipelineNodeEntity,
  type NodeDefinition,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import * as pipeline from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { ERROR_PORT } from '@base/features/pipeline/domain/structs/port-name.struct.ts';
import type { PipelineLayout } from '@base/features/pipeline/domain/structs/pipeline-layout.struct.ts';
import { positionAfter } from '@base/features/pipeline/presentation/presenters/blueprint-layout.presenter.ts';
import { dependencyText } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';
import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
import type { PortChange } from '@base/features/pipeline/presentation/ui/editor/node/switch-draft.state.svelte.ts';
import {
  START_NODE_ID,
  depsOf,
  edgeBetween,
  edgeId,
  flowToNodes,
  nodeOf,
  nodesToFlow,
  type FlowEdge,
  type FlowNode,
  type PipelineFlowNode,
} from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
import type { NodePlaces } from './node-places.state.svelte.ts';

export interface BlueprintParams {
  /** Getters: the editor's document changes. */
  nodes: () => PipelineNodeEntity[];
  pipelineName: () => string;
  onNodesChange: (nodes: PipelineNodeEntity[]) => void;
  /** Read at each build of the graph: a later save of a place does not move a node. */
  savedLayout?: () => PipelineLayout | null | undefined;
  places?: NodePlaces;
}

/** How a new node joins the graph: after a node (by default the start node) or one of its ports, or inside an edge. */
export type NodeLink = { after?: string; port?: string } | { replacing: string };

export type NodePlacement = NodeLink & { position?: XYPosition };

/**
 * The canvas graph, in node with the script. The script owns the nodes, the
 * canvas owns the positions, so the graph cannot be derived from the nodes.
 * `lastEmitted` recognises the echo of our own edits, or one edit would loop.
 * `@xyflow/svelte` writes added and deleted elements itself: `sync` publishes them.
 *
 * The side panel shows `inspected`, which a click opens and nothing else: the selection of the
 * canvas (a drag, a box, the delete key) never opens or closes it.
 *
 * The edges are the needs: an edge from a port leaves from its handle. The error output of a node
 * shows while its toggle is on (`errorOutputs`, never saved: the server has no field for it) or
 * while an edge leaves from it.
 */
export const createBlueprint = (params: BlueprintParams) => {
  // `$state.raw`: replaced whole, never mutated.
  let flowNodes = $state.raw<FlowNode[]>([]);
  let edges = $state.raw<FlowEdge[]>([]);
  let inspectedId = $state<string | null>(null);
  /** Bumped when an "Undo" puts a node back: the inspector builds its draft again. */
  let revision = $state(0);
  const errorOutputs = new SvelteSet<string>();

  let lastEmitted = '';

  const keyOf = (nodes: PipelineNodeEntity[], name: string) => JSON.stringify({ nodes, name });

  const emit = () => {
    if (readOnly) return;
    const nodes = flowToNodes(flowNodes, edges);
    const key = keyOf(nodes, params.pipelineName());
    if (key === lastEmitted) return;

    lastEmitted = key;
    params.onNodesChange(nodes);
  };

  // Writes only `nodes` and `edges`, so it never re-triggers itself.
  $effect(() => {
    const nodes = params.nodes();
    const name = params.pipelineName();
    if (keyOf(nodes, name) === lastEmitted) return;

    const flow = nodesToFlow(nodes, name, untrack(() => params.savedLayout?.()));
    // A node that is still there keeps its place and its selection: only a new one is laid out.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to this run, never state
    const previous = new Map(untrack(() => flowNodes).map(flowNode => [flowNode.id, flowNode]));
    flowNodes = flow.flowNodes.map(flowNode => {
      const kept = previous.get(flowNode.id);
      return kept ? { ...flowNode, position: kept.position, selected: kept.selected } : flowNode;
    });
    edges = flow.edges;

    lastEmitted = keyOf(nodes, name);
  });

  /**
   * Two nodes share an id: the graph shows them, marked, but cannot edit them, as an edit goes
   * through the ids. The document is never rewritten to remove the repeat.
   */
  const readOnly = $derived(pipeline.repeatedNodeIds(params.nodes()).length > 0);

  const inspected = $derived(
    flowNodes.find((flowNode): flowNode is PipelineFlowNode => flowNode.id === inspectedId && !!nodeOf(flowNode)),
  );

  const currentNodes = () => flowToNodes(flowNodes, edges);

  // From the document, which follows each edit: a drag, which only moves the nodes, does not change it.
  const issues = $derived(pipeline.nodeIssues(params.nodes()));

  const hasErrorPort = (id: string) =>
    errorOutputs.has(id) ||
    edges.some(edge => edge.source === id && edge.sourceHandle === ERROR_PORT);

  params.places?.connect(() => flowNodes);

  /**
   * Writes back what an operation of the pipeline changed in the nodes. The edges are the
   * dependencies of the graph: a rename is followed in them too.
   */
  const applyToNodes = (next: PipelineNodeEntity[], renamed?: { from: string; to: string }) => {
    if (readOnly) return;
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to a call, never state
    const byId = new Map(next.map(node => [node.id, node]));
    const follow = (id: string) => (renamed && id === renamed.from ? renamed.to : id);

    flowNodes = flowNodes.map((flowNode): FlowNode => {
      // The start node is the pipeline, not a node.
      if (flowNode.type !== 'pipelineNode') return flowNode;
      const id = follow(flowNode.id);
      const node = byId.get(id);
      return node ? { ...flowNode, id, data: { node } } : flowNode;
    });

    if (renamed) {
      if (inspectedId === renamed.from) inspectedId = renamed.to;
      if (errorOutputs.delete(renamed.from)) errorOutputs.add(renamed.to);
      edges = edges.map(edge => {
        if (edge.source !== renamed.from && edge.target !== renamed.from) return edge;
        const source = follow(edge.source);
        const target = follow(edge.target);
        return { ...edge, id: edgeId(source, target, edge.sourceHandle), source, target };
      });
    }

    emit();
  };

  /**
   * Removes the edges from a port that goes, and says so with an "Undo" that puts back the node as
   * it was and the edges that still have both ends: the editor has no history.
   */
  const dropPortEdges = (id: string, port: string, before: NodeDefinition) => {
    const dropped = edges.filter(edge => edge.source === id && edge.sourceHandle === port);
    if (!dropped.length) return;
    edges = edges.filter(edge => !dropped.includes(edge));

    const targets = new Intl.ListFormat(activeLocale(), { type: 'unit' }).format(
      dropped.map(edge => edge.target),
    );
    toast(t(nodeMessages.linksRemoved(dependencyText({ node: id, port }), targets)), {
      action: {
        label: t(scriptingMessages.undo),
        onClick: () => {
          // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to a call, never state
          const ids = new Set(flowNodes.map(flowNode => flowNode.id));
          if (!ids.has(id)) return;
          edges = [
            ...edges,
            ...dropped.filter(edge => ids.has(edge.target) && !edges.some(other => other.id === edge.id)),
          ];
          if (port === ERROR_PORT) errorOutputs.add(id);
          revision += 1;
          applyToNodes(pipeline.updateNode(currentNodes(), id, before));
        },
      },
    });
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
    get revision() {
      return revision;
    },

    /** What stops the node from being saved, in its pipeline. */
    issueOf: (id: string) => issues.get(id) ?? null,

    /**
     * Nothing may depend on the start node, which is the pipeline itself, and no link may close a
     * loop: the source must not wait for the target already. Only a node that runs a step has an
     * error output.
     */
    canConnect: ({ source, target, sourceHandle }: Connection) => {
      if (readOnly || target === START_NODE_ID || source === target) return false;
      const nodes = currentNodes();
      const from = nodes.find(node => node.id === source);
      if (sourceHandle === ERROR_PORT && !(from && runsStep(from))) return false;
      return !pipeline.waitsFor(nodes, source, target);
    },

    sync() {
      emit();
      // The canvas may have deleted the inspected node.
      if (!inspected) inspectedId = null;
    },

    /** A node no edge goes into: saving links it to the start node, so the canvas warns. */
    isDetached: (id: string) => !edges.some(edge => edge.target === id),

    /** The needs of the node: the inspector lists them. */
    dependenciesOf: (id: string) => depsOf(edges, id),

    /** The node shows its red `error` handle. */
    hasErrorPort,

    /** The nodes whose outputs the switch can read. */
    outputNodesOf: (id: string) => pipeline.outputCandidates(params.nodes(), id),

    /** On: the node shows its error output. Off: it goes, with its edges ("Undo" puts them back). */
    setErrorOutput(id: string, on: boolean) {
      if (readOnly) return;
      if (on) {
        errorOutputs.add(id);
        return;
      }
      errorOutputs.delete(id);
      const node = currentNodes().find(other => other.id === id);
      if (!node) return;
      dropPortEdges(id, ERROR_PORT, definitionOf(node));
      emit();
    },

    /** Adds the node; the caller opens it with `inspect` when a click asked for it. Returns its final id. */
    addNode(desiredId: string, value: NodeDefinition, placement: NodePlacement = {}): string {
      if (readOnly) return desiredId;
      const { id } = pipeline.addNode(currentNodes(), desiredId, value);
      const replaced =
        'replacing' in placement ? edges.find(edge => edge.id === placement.replacing) : undefined;
      const after = 'after' in placement ? placement.after : undefined;
      const source = replaced?.source ?? after ?? START_NODE_ID;
      const port = replaced?.sourceHandle ?? ('port' in placement ? placement.port : undefined);

      const flowNode: PipelineFlowNode = {
        id,
        type: 'pipelineNode',
        position: placement.position ?? positionAfter(flowNodes, replaced?.source ?? after),
        data: { node: { id, deps: [], ...value } },
      };

      flowNodes = [...flowNodes, flowNode];
      edges = [
        ...edges.filter(edge => edge !== replaced),
        edgeBetween(source, id, port),
        ...(replaced ? [edgeBetween(id, replaced.target)] : []),
      ];

      emit();
      return id;
    },

    /** `port`: the edges of a renamed port follow it, the edges of a port that goes go too. */
    updateNode(id: string, value: NodeDefinition, port?: PortChange) {
      if (readOnly) return;
      const node = currentNodes().find(other => other.id === id);
      if (port && node) {
        const { from, to } = port;
        if (to === null) dropPortEdges(id, from, definitionOf(node));
        else
          edges = edges.map(edge =>
            edge.source === id && edge.sourceHandle === from
              ? { ...edge, id: edgeId(id, edge.target, to), sourceHandle: to }
              : edge,
          );
      }
      applyToNodes(pipeline.updateNode(currentNodes(), id, value));
    },

    /** A taken or empty id keeps the node usable: it gets a suffix, or keeps its id. */
    renameNode(id: string, desired: string): string {
      const change = pipeline.renameNode(currentNodes(), id, desired);
      if (change.id !== id) applyToNodes(change.nodes, { from: id, to: change.id });
      return change.id;
    },

    removeNode(id: string) {
      if (id === START_NODE_ID || readOnly) return;
      if (inspectedId === id) inspectedId = null;
      errorOutputs.delete(id);
      flowNodes = flowNodes.filter(flowNode => flowNode.id !== id);
      edges = edges.filter(edge => edge.source !== id && edge.target !== id);
      emit();
    },

    /**
     * Opens the side panel on a node, selected on the canvas; `null` closes it. The start node
     * is the pipeline: its name is edited in the header, so it closes the panel too.
     */
    inspect(id: string | null) {
      const next = id === START_NODE_ID || readOnly ? null : id;
      inspectedId = next;
      flowNodes = flowNodes.map(flowNode =>
        Boolean(flowNode.selected) === (flowNode.id === next) ? flowNode : { ...flowNode, selected: flowNode.id === next },
      );
    },

    /** The end of a drag. A read-only canvas saves nothing. */
    placesMoved(moved: readonly Pick<FlowNode, 'id' | 'position'>[]) {
      if (!readOnly) params.places?.moved(moved);
    },

    /** Lays the graph out again by depth: the same layout as a freshly opened pipeline. */
    arrange() {
      const flow = nodesToFlow(flowToNodes(flowNodes, edges), params.pipelineName());
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to this call, never state
      const positions = new Map(flow.flowNodes.map(flowNode => [flowNode.id, flowNode.position]));
      flowNodes = flowNodes.map(flowNode => ({ ...flowNode, position: positions.get(flowNode.id) ?? flowNode.position }));
      if (!readOnly) params.places?.moved(flowNodes);
    },
  };
};

export type Blueprint = ReturnType<typeof createBlueprint>;
