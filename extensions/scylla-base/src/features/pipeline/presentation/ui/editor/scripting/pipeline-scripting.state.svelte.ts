import { activeLocale, t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import {
  blankDefinition,
  type PipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import {
  addNode,
  dependencyCandidates,
  dependentsOf,
  hasRepeats,
  moveNode,
  removeNode,
  renameNode,
  setDependencies,
  updateNode,
} from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { createNodeDrafts } from './node-drafts.state.svelte.ts';
import { createNodePanes } from './node-panes.state.svelte.ts';
import { nodeRows } from '@base/features/pipeline/presentation/presenters/node-list.presenter.ts';
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

const sameDeps = (a: string[], b: string[]) =>
  a.length === b.length && a.every(dep => b.includes(dep));

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

  const panes = createNodePanes(() => nodeRows(params.nodes()).map(({ node }) => node.id));

  const nodeOf = (id: string | null) => params.nodes().find(node => node.id === id);

  const rename = (id: string, desired: string): string => {
    const change = renameNode(params.nodes(), id, desired);
    if (change.id === id) return id;

    panes.rename(id, change.id);
    params.onNodesChange(change.nodes);
    return change.id;
  };

  const drafts = createNodeDrafts({
    onChange: (id, value) => params.onNodesChange(updateNode(params.nodes(), id, value)),
    onRename: rename,
  });

  const focusedNode = $derived(nodeOf(panes.focusedId));

  // The document may have changed since: each node gets back only what still makes no loop.
  const restore = (previous: PipelineNodeEntity[]) => {
    let nodes = params.nodes();
    for (const { id, deps } of previous) {
      if (!nodes.some(node => node.id === id)) continue;
      const candidates = dependencyCandidates(nodes, id);
      nodes = setDependencies(
        nodes,
        id,
        deps.filter(dep => candidates.includes(dep)),
      );
    }
    params.onNodesChange(nodes);
  };

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
      const change = addNode(
        params.nodes(),
        NEW_NODE_ID,
        blankDefinition('script'),
        panes.focusedId ?? undefined,
      );
      params.onNodesChange(change.nodes);
      panes.open(change.id);
    },

    remove(id: string) {
      params.onNodesChange(removeNode(params.nodes(), id));
    },

    setDependencies(id: string, deps: string[]) {
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

      const lost = before[index].deps.filter(dep => !after[index].deps.includes(dep));
      if (rewired.length === 0 && lost.length === 0) return;
      const message =
        target !== null && rewired.length > 0
          ? scriptingMessages.nodeMoved(id, target)
          : scriptingMessages.dependenciesDropped(
              id,
              new Intl.ListFormat(activeLocale(), { type: 'unit' }).format(lost),
            );
      toast(t(message), {
        action: {
          label: t(scriptingMessages.undo),
          // The moved node first: it drops its new dependency before the others get theirs back.
          onClick: () => restore([before[index], ...rewired]),
        },
      });
    },

    dependentsOf: (id: string) => dependentsOf(params.nodes(), id),
    dependencyCandidates: (id: string) => dependencyCandidates(params.nodes(), id),
  };
};

export type PipelineScripting = ReturnType<typeof createPipelineScripting>;
