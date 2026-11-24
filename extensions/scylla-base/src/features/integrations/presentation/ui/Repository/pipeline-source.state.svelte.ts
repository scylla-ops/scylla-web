import { createMutation, createQuery } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type {
  PipelineSource,
  RepositoryLink,
} from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import { pipelineSourceMessages as messages } from '@base/features/integrations/presentation/messages/pipeline-source.messages.ts';
import {
  pipelineSourceMutations,
  pipelineSourceQueries,
} from '@base/features/integrations/presentation/pipeline-source.queries.ts';

/**
 * The pipeline source of a project: the files of the default branch, and the move from one
 * source to the other. Construct it during component initialisation.
 */
export const createPipelineSource = (
  projectId: () => string,
  link: () => RepositoryLink | null,
) => {
  // The dialog keeps its target while it closes, so that its text does not change.
  let open = $state(false);
  let target = $state<PipelineSource>('file');

  const current = $derived(link()?.pipelineSource ?? 'editor');
  // The card lists the files of a project on files; the dialog lists them before a move there.
  const filesQuery = createQuery(() =>
    pipelineSourceQueries.files(
      projectId(),
      !!link() && (current === 'file' || (open && target === 'file')),
    ),
  );
  const set = createMutation(() => pipelineSourceMutations.set());

  return {
    get current() {
      return current;
    },
    filesQuery,
    /** `true` while the dialog of a move is open. */
    get open() {
      return open;
    },
    /** The source that the dialog moves to. */
    get target() {
      return target;
    },
    get pending() {
      return set.isPending;
    },
    /** The refusal of the move, in the dialog. Empty when there is none. */
    get error() {
      return set.isError ? ScyllaError.from(set.error).userMessage() : '';
    },
    /** Opens the dialog of a move to another source. */
    ask: (next: PipelineSource) => {
      if (next === current) return;
      set.reset();
      target = next;
      open = true;
    },
    cancel: () => {
      if (!set.isPending) open = false;
    },
    confirm: () => {
      const source = target;
      set.mutate(
        { projectId: projectId(), source },
        {
          onSuccess: () => {
            toast.success(t(source === 'file' ? messages.nowFiles : messages.nowEditor));
            open = false;
          },
        },
      );
    },
  };
};

export type PipelineSourceState = ReturnType<typeof createPipelineSource>;
