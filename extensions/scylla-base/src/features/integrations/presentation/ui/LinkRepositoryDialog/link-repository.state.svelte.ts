import { createMutation } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
import { linkErrorText } from '@base/features/integrations/presentation/presenters/repository-link.presenter.ts';
import { repositoryLinkMutations } from '@base/features/integrations/presentation/repository-link.queries.ts';
import { createRepositoryPicker } from '../repository-picker.state.svelte.ts';

export interface LinkRepositoryParams {
  projectId: () => string;
  workspaceId: () => string;
  onLinked: () => void;
}

/**
 * The picker of the repository of a project, and the link. Construct it during component
 * initialisation.
 */
export const createLinkRepository = (params: LinkRepositoryParams) => {
  const link = createMutation(() => repositoryLinkMutations.link());
  const picker = createRepositoryPicker({
    workspaceId: params.workspaceId,
    projectId: params.projectId,
    onChange: () => {
      if (link.isError) link.reset();
    },
  });

  return {
    picker,
    get linking() {
      return link.isPending;
    },
    get canSubmit() {
      return !!picker.connection && !!picker.selected && !link.isPending;
    },
    get error(): string | null {
      return link.isError ? linkErrorText(link.error) : null;
    },
    submit: () => {
      const { connection, selected } = picker;
      if (!connection || !selected || link.isPending) return;
      link.mutate(
        {
          projectId: params.projectId(),
          connectionId: connection.id,
          externalId: selected.repository.externalId,
        },
        {
          onSuccess: linked => {
            toast.success(t(messages.linked(linked.fullName)));
            params.onLinked();
          },
        },
      );
    },
  };
};

export type LinkRepository = ReturnType<typeof createLinkRepository>;
