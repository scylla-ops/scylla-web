import { createMutation } from '@scylla/core-sdk';
import {
  canPublishVersion,
  detectParameters,
  fragmentNodesOf,
  latestVersion,
  type FragmentEntity,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import {
  nodeIdIssue,
  type NodeIdIssue,
} from '@base/features/pipeline/domain/structs/node-id.struct.ts';
import { fragmentMutations } from '@base/features/pipeline/presentation/fragment.queries.ts';
import type { EditorLibrary } from '../editor-library.state.svelte.ts';

/** Why the name cannot be saved: the rule of a node id, or a fragment that the person cannot publish. */
export type FragmentNameIssue = NodeIdIssue | { kind: 'taken' };

export interface SaveFragmentParams {
  /** Read once: the dialog is built again at each opening. */
  nodes: PipelineNodeEntity[];
  /** `false`: a port leaves the selection, so the nodes stay and no block replaces them. */
  replaceable: boolean;
  library: EditorLibrary;
  pipelineName: string;
  /** `replace`: the nodes give their place to a block of the saved version. */
  onSaved: (fragment: FragmentEntity, replace: boolean) => void;
}

/**
 * The draft of a fragment, from the selected nodes. A name that the library has already
 * publishes a new version of that fragment, when the person may: the author or an admin.
 */
export const createSaveFragment = ({
  nodes,
  replaceable,
  library,
  pipelineName,
  onSaved,
}: SaveFragmentParams) => {
  const detected = detectParameters(nodes);

  let name = $state('');
  let description = $state('');
  let changes = $state('');
  let tags = $state<string[]>([]);
  let replace = $state(replaceable);
  // The fragment whose new version the person accepted to publish: a name typed again asks again.
  let confirmedId = $state<string | null>(null);
  let hidden = $state<string[]>([]);

  const create = createMutation(() => fragmentMutations.create());
  const publish = createMutation(() => fragmentMutations.publishVersion());

  const existing = $derived(library.fragments.find(fragment => fragment.name === name.trim()));
  const canPublish = $derived(
    !!existing &&
      !!library.author &&
      canPublishVersion(existing, { id: library.author.id, admin: library.admin }),
  );
  const nameIssue = $derived<FragmentNameIssue | null>(
    nodeIdIssue(name) ?? (existing && !canPublish ? { kind: 'taken' } : null),
  );
  const versionNumber = $derived(existing ? latestVersion(existing).number + 1 : 1);
  const parameters = $derived(detected.filter(parameter => !hidden.includes(parameter.key)));
  const saving = $derived(create.isPending || publish.isPending);
  const confirmed = $derived(!!existing && confirmedId === existing.id);
  const canSave = $derived(
    !nameIssue && (!existing || confirmed) && !!library.author && !!library.workspaceId && !saving,
  );

  const done = (fragment: FragmentEntity) => onSaved(fragment, replace && replaceable);

  return {
    detected,
    get name() {
      return name;
    },
    set name(next: string) {
      name = next;
    },
    get description() {
      return description;
    },
    set description(next: string) {
      description = next;
    },
    get changes() {
      return changes;
    },
    set changes(next: string) {
      changes = next;
    },
    get tags() {
      return tags;
    },
    /** A new version of a fragment that has this name: the person must accept it. */
    get confirmed() {
      return confirmed;
    },
    set confirmed(next: boolean) {
      confirmedId = next && existing ? existing.id : null;
    },
    get replace() {
      return replace;
    },
    set replace(next: boolean) {
      replace = next;
    },
    get nameIssue() {
      return nameIssue;
    },
    /** The fragment that the save gives a new version, if any. */
    get existing() {
      return existing;
    },
    get versionNumber() {
      return versionNumber;
    },
    get saving() {
      return saving;
    },
    get canSave() {
      return canSave;
    },

    isExposed: (key: string) => !hidden.includes(key),
    /** A parameter that is not exposed keeps its value in the nodes: each pipeline runs it as is. */
    setExposed(key: string, exposed: boolean) {
      hidden = exposed ? hidden.filter(other => other !== key) : [...hidden, key];
    },

    addTag(raw: string) {
      const tag = raw.trim().toLowerCase();
      if (tag && !tags.includes(tag)) tags = [...tags, tag];
    },
    removeTag(tag: string) {
      tags = tags.filter(other => other !== tag);
    },

    save() {
      const author = library.author;
      if (!canSave || !author || !library.workspaceId) return;
      const content = { nodes: fragmentNodesOf(nodes), parameters, author };

      if (existing) {
        const lines = changes
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);
        publish.mutate({ id: existing.id, ...content, changes: lines }, { onSuccess: done });
        return;
      }
      create.mutate(
        {
          workspaceId: library.workspaceId,
          name: name.trim(),
          description: description.trim(),
          tags,
          sourcePipeline: pipelineName,
          ...content,
        },
        { onSuccess: done },
      );
    },
  };
};

export type SaveFragment = ReturnType<typeof createSaveFragment>;
