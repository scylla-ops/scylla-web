import {
  definitionOf,
  type PipelineNodeEntity,
  type NodeDefinition,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import {
  createNodeDraft,
  type NodeDraft,
} from '@base/features/pipeline/presentation/ui/editor/node/node-draft.state.svelte.ts';

export interface NodeDraftsParams {
  onChange: (id: string, value: NodeDefinition) => void;
  /** Returns the id the node really got. */
  onRename: (id: string, desired: string) => string;
}

interface Entry {
  id: string;
  /** What the draft last wrote to the document, or read from it. */
  signature: string;
  draft: NodeDraft;
  dispose: () => void;
}

// `definitionOf` puts the keys in one order: a node and the draft's value compare as text.
const signatureOf = (definition: NodeDefinition) =>
  JSON.stringify(definitionOf({ id: '', deps: [], ...definition }));

/**
 * One draft per node, shared by every view of the node: the panes that show it and the properties
 * panel. Two drafts of one node would each write their own copy and undo the other's edits. A node
 * that the document changed from elsewhere (the full document, the blueprint) gets a new draft.
 */
export const createNodeDrafts = ({ onChange, onRename }: NodeDraftsParams) => {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a cache of drafts, never read as state
  const entries = new Map<string, Entry>();

  const build = (node: PipelineNodeEntity): Entry => {
    // The draft's callbacks read the entry, so the entry exists before the draft.
    const entry = { id: node.id, signature: signatureOf(node) } as Entry;
    // Its own root: the deriveds of a draft must outlive the component that asked for it first,
    // else they go stale when that component is mounted again (a new tab, a rename).
    entry.dispose = $effect.root(() => {
      entry.draft = createNodeDraft({
        node,
        onChange: value => {
          entry.signature = signatureOf(value);
          onChange(entry.id, value);
        },
        onRename: desired => {
          const id = onRename(entry.id, desired);
          if (id !== entry.id) {
            entries.delete(entry.id);
            entry.id = id;
            entries.set(id, entry);
          }
          return id;
        },
      });
    });
    return entry;
  };

  return {
    /** Drops the drafts of the nodes that left the document. */
    prune(ids: string[]) {
      for (const [id, entry] of entries) {
        if (ids.includes(id)) continue;
        entry.dispose();
        entries.delete(id);
      }
    },

    dispose() {
      for (const entry of entries.values()) entry.dispose();
      entries.clear();
    },

    of(node: PipelineNodeEntity): NodeDraft {
      const kept = entries.get(node.id);
      if (kept?.signature === signatureOf(node)) return kept.draft;

      kept?.dispose();
      const entry = build(node);
      entries.set(node.id, entry);
      return entry.draft;
    },
  };
};
