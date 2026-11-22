import { SvelteSet } from 'svelte/reactivity';
import { activeLocale, t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import {
  blankDefinition,
  definitionOf,
  sameDependency,
  type Dependency,
  type NodeDefinition,
  type PipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { addNode, dependencyCandidates, dependentsOf, dropPort, hasRepeats, moveNode, nodeIssues, outputCandidates, removeNode, renameNode, renamePort, setDependencies, updateNode } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { ERROR_PORT, type PortName } from '@base/features/pipeline/domain/structs/port-name.struct.ts';
import { createNodeDrafts } from './node-drafts.state.svelte.ts';
import { createNodePanes } from './node-panes.state.svelte.ts';
import type { PortChange } from '@base/features/pipeline/presentation/ui/editor/node/switch-draft.state.svelte.ts';
import { dependencyText } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';
import { nodeRows } from '@base/features/pipeline/presentation/presenters/node-list.presenter.ts';
import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';

export interface PipelineScriptingParams {
  /** Getters: the editor's document changes. */
  nodes: () => PipelineNodeEntity[];
  /** The document parses: its nodes can be shown one by one. */
  isValid: () => boolean;
  onNodesChange: (nodes: PipelineNodeEntity[]) => void;
}

/** One node at a time, or the whole document as text. */
export type ScriptingMode = 'nodes' | 'document';

const NEW_NODE_ID = 'node';

const hasNeed = (deps: Dependency[], need: Dependency) => deps.some(dep => sameDependency(dep, need));

const sameDeps = (a: Dependency[], b: Dependency[]) =>
  a.length === b.length && a.every(dep => hasNeed(b, dep));

const listOf = (items: string[]) => new Intl.ListFormat(activeLocale(), { type: 'unit' }).format(items);

/**
 * The scripting tab. The document stays the single source of truth: every edit of a node goes
 * back to it as nodes, as the blueprint does. A document that does not parse has no nodes to
 * show: the tab shows the text, so that it can be fixed. So does a document with a repeated node id
 * or dependency: the views key the nodes by id.
 */
export const createPipelineScripting = (params: PipelineScriptingParams) => {
  let chosenMode = $state<ScriptingMode>('nodes');
  const canShowNodes = $derived(params.isValid() && !hasRepeats(params.nodes()));
  const mode = $derived<ScriptingMode>(canShowNodes ? chosenMode : 'document');

  /** The nodes that show their error output with no need on it: never saved, the server has no field for it. */
  const errorOutputs = new SvelteSet<string>();

  const panes = createNodePanes(() => nodeRows(params.nodes()).map(({ node }) => node.id));

  const nodeOf = (id: string | null) => params.nodes().find(node => node.id === id);

  const rename = (id: string, desired: string): string => {
    const change = renameNode(params.nodes(), id, desired);
    if (change.id === id) return id;

    panes.rename(id, change.id);
    if (errorOutputs.delete(id)) errorOutputs.add(change.id);
    params.onNodesChange(change.nodes);
    return change.id;
  };

  const issues = $derived(nodeIssues(params.nodes()));

  const focusedNode = $derived(nodeOf(panes.focusedId));

  // The document may have changed since: each node gets back only what still makes no loop.
  const restore = (previous: PipelineNodeEntity[], from = params.nodes()) => {
    let nodes = from;
    for (const { id, deps } of previous) {
      if (!nodes.some(node => node.id === id)) continue;
      const candidates = dependencyCandidates(nodes, id);
      nodes = setDependencies(
        nodes,
        id,
        deps.filter(dep => hasNeed(candidates, dep)),
      );
    }
    params.onNodesChange(nodes);
  };

  /**
   * Removes the needs on a port of the node that goes (a case, `otherwise` or `error`), and says so
   * with an "Undo" that puts back the node as it was and the needs on the port.
   */
  const dropPortNeeds = (nodes: PipelineNodeEntity[], id: string, port: PortName, before: NodeDefinition) => {
    const after = dropPort(nodes, id, port);
    params.onNodesChange(after);
    const waiting = nodes.filter((node, i) => !sameDeps(node.deps, after[i].deps));
    if (!waiting.length) return;

    toast(t(nodeMessages.linksRemoved(dependencyText({ node: id, port }), listOf(waiting.map(node => node.id)))), {
      action: {
        label: t(scriptingMessages.undo),
        onClick: () => {
          if (!params.nodes().some(node => node.id === id)) return;
          if (port === ERROR_PORT) errorOutputs.add(id);
          restore(waiting, updateNode(params.nodes(), id, before));
        },
      },
    });
  };

  /** A port that a switch renamed takes its needs with it; one that goes takes them away. */
  const change = (id: string, value: NodeDefinition, port?: PortChange) => {
    const node = nodeOf(id);
    const nodes = updateNode(params.nodes(), id, value);
    if (!port || !node) return params.onNodesChange(nodes);
    if (port.to !== null) return params.onNodesChange(renamePort(nodes, id, port.from, port.to));
    dropPortNeeds(nodes, id, port.from, definitionOf(node));
  };

  const drafts = createNodeDrafts({ onChange: change, onRename: rename });

  return {
    get mode() {
      return mode;
    },
    set mode(next: ScriptingMode) {
      chosenMode = next;
    },
    get canShowNodes() {
      return canShowNodes;
    },
    get nodes() {
      return params.nodes();
    },
    panes,
    /** The node the properties panel shows: the one of the focused pane. */
    get focusedNode() {
      return focusedNode;
    },

    nodeOf,
    /** The draft of a node, shared by all the views of the node. */
    draftOf(node: PipelineNodeEntity) {
      drafts.prune(params.nodes().map(({ id }) => id));
      return drafts.of(node);
    },
    /** Releases the drafts: the view calls it when it goes away. */
    dispose: () => drafts.dispose(),

    /** Adds a node after the focused one, and opens it. */
    add() {
      const change = addNode(params.nodes(), NEW_NODE_ID, blankDefinition('script'), panes.focusedId ?? undefined);
      params.onNodesChange(change.nodes);
      panes.open(change.id);
    },

    remove(id: string) {
      errorOutputs.delete(id);
      params.onNodesChange(removeNode(params.nodes(), id));
    },

    /** What stops the node from being saved, in its pipeline. */
    issueOf: (id: string) => issues.get(id) ?? null,

    /** The node shows its error output: its toggle is on, or a need names it. */
    hasErrorOutput: (id: string) =>
      errorOutputs.has(id) ||
      params.nodes().some(node => node.deps.some(dep => dep.node === id && dep.port === ERROR_PORT)),

    /** Off, the needs on the error output go: "Undo" puts them back. */
    setErrorOutput(id: string, on: boolean) {
      const node = nodeOf(id);
      if (!node) return;
      if (on) {
        errorOutputs.add(id);
        return;
      }
      errorOutputs.delete(id);
      dropPortNeeds(params.nodes(), id, ERROR_PORT, definitionOf(node));
    },

    setDependencies(id: string, deps: Dependency[]) {
      panes.pin();
      params.onNodesChange(setDependencies(params.nodes(), id, deps));
    },

    /**
     * Moves a node in the list (`moveNode`). A move that removes dependencies says so, and
     * can be undone: the editor has no history.
     */
    moveNode(id: string, target: string | null, keep: boolean) {
      const before = params.nodes();
      const index = before.findIndex(node => node.id === id);
      if (index === -1) return;

      const after = moveNode(before, id, target, keep);
      const movedChanged = !sameDeps(before[index].deps, after[index].deps);
      // The other nodes that waited for the moved one and now wait for something else.
      const rewired = before.filter(
        (node, i) => i !== index && !sameDeps(node.deps, after[i].deps),
      );
      if (!movedChanged && rewired.length === 0) return;
      params.onNodesChange(after);

      const lost = before[index].deps.filter(dep => !hasNeed(after[index].deps, dep));
      if (rewired.length === 0 && lost.length === 0) return;
      const message =
        target !== null && rewired.length > 0
          ? scriptingMessages.nodeMoved(id, target)
          : scriptingMessages.dependenciesDropped(id, listOf(lost.map(dependencyText)));
      toast(t(message), {
        action: {
          label: t(scriptingMessages.undo),
          // The moved node first: it drops its new dependency before the others get theirs back.
          onClick: () => restore([before[index], ...rewired]),
        },
      });
    },

    dependentsOf: (id: string) => dependentsOf(params.nodes(), id),
    /** The nodes whose outputs the switch can read. */
    outputNodesOf: (id: string) => outputCandidates(params.nodes(), id),
    dependencyCandidates: (id: string) => dependencyCandidates(params.nodes(), id),
  };
};

export type PipelineScripting = ReturnType<typeof createPipelineScripting>;
