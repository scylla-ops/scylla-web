import { createMutation } from '@scylla/core-sdk';
import {
  editedParameters,
  latestVersion,
  type FragmentAuthor,
  type FragmentEntity,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type {
  NodeDefinition,
  PipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import {
  removeNode,
  renameNode,
  updateNode,
} from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { fragmentMutations } from '@base/features/pipeline/presentation/fragment.queries.ts';

interface Options {
  fragment: () => FragmentEntity;
  author: () => FragmentAuthor | undefined;
  /** The reader can publish a version of this fragment. */
  editable: () => boolean;
}

/**
 * The nodes of the latest version, changed on the page of the fragment. Nothing is saved until
 * the changes become a new version.
 */
export const createFragmentEdit = ({ fragment, author, editable }: Options) => {
  const publish = createMutation(() => fragmentMutations.publishVersion());

  // Tied to its fragment: the page stays mounted when a link opens another one.
  let draft = $state.raw<{ fragmentId: string; nodes: PipelineNodeEntity[] } | null>(null);
  let changes = $state('');
  let selectedId = $state<string | null>(null);

  const latest = $derived(latestVersion(fragment()));
  const edited = $derived(draft?.fragmentId === fragment().id ? draft.nodes : null);
  const nodes = $derived(edited ?? latest.nodes);
  const keep = (next: PipelineNodeEntity[]) => (draft = { fragmentId: fragment().id, nodes: next });

  return {
    get editable() {
      return editable();
    },
    get nodes() {
      return nodes;
    },
    get dirty() {
      return edited !== null;
    },
    get nextNumber() {
      return latest.number + 1;
    },
    get changes() {
      return changes;
    },
    set changes(next: string) {
      changes = next;
    },
    get publishing() {
      return publish.isPending;
    },
    get selected() {
      return nodes.find(node => node.id === selectedId);
    },
    select(id: string | null) {
      selectedId = id;
    },

    update(id: string, definition: NodeDefinition) {
      keep(updateNode(nodes, id, definition));
    },
    /** Returns the id that the node really got. */
    rename(id: string, desired: string): string {
      const change = renameNode(nodes, id, desired);
      keep(change.nodes);
      selectedId = change.id;
      return change.id;
    },
    remove(id: string) {
      keep(removeNode(nodes, id));
      selectedId = null;
    },
    discard() {
      draft = null;
      changes = '';
      selectedId = null;
    },

    publish() {
      const by = author();
      if (!edited || !by || !editable()) return;
      publish.mutate(
        {
          id: fragment().id,
          nodes: edited,
          parameters: editedParameters(latest, edited),
          changes: changes.trim() ? [changes.trim()] : [],
          author: by,
        },
        {
          onSuccess: () => {
            draft = null;
            changes = '';
          },
        },
      );
    },
  };
};

export type FragmentEdit = ReturnType<typeof createFragmentEdit>;
