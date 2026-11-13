import { createMutation, createQuery } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import { projectQueries } from '@base/features/project';
import type { ProviderRepository } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
import {
  connectionOptionLabel,
  linkErrorText,
  repositoryOptionDetails,
} from '@base/features/integrations/presentation/presenters/repository-link.presenter.ts';
import { repositoryLinkMutations } from '@base/features/integrations/presentation/repository-link.queries.ts';
import { vcsConnectionQueries } from '@base/features/integrations/presentation/vcs-connection.queries.ts';

/** The time between the last key and the search on the provider. */
const SEARCH_DELAY_MS = 300;

export interface LinkRepositoryParams {
  projectId: () => string;
  workspaceId: () => string;
  onLinked: () => void;
}

/** A repository of the list, as the dialog shows it. */
export interface RepositoryOption {
  repository: ProviderRepository;
  details: string;
  /** Another project has it. */
  taken: boolean;
}

/**
 * The picker of the repository of a project: a connection of the workspace, a search on the
 * provider, one repository. Construct it during component initialisation.
 */
export const createLinkRepository = (params: LinkRepositoryParams) => {
  const connectionsQuery = createQuery(() => vcsConnectionQueries.byWorkspace(params.workspaceId()));
  const projectsQuery = createQuery(() => projectQueries.lookup(params.workspaceId()));
  const link = createMutation(() => repositoryLinkMutations.link());

  // Only an active connection can list its repositories.
  const connections = $derived(
    (connectionsQuery.data ?? []).filter(connection => connection.state === 'active'),
  );
  let picked = $state('');
  const connection = $derived(
    connections.find(item => item.id === picked) ?? connections[0] ?? null,
  );

  let typed = $state('');
  let search = $state('');
  let timer: ReturnType<typeof setTimeout> | undefined;

  const repositoriesQuery = createQuery(() =>
    vcsConnectionQueries.repositories(
      { projectId: params.projectId(), connectionId: connection?.id ?? '', search },
      !!connection,
    ),
  );

  let chosen = $state('');

  const projectName = (id: string | undefined) =>
    id ? projectsQuery.data?.items.find(project => project.id === id)?.name : undefined;
  const options = $derived<RepositoryOption[]>(
    (repositoriesQuery.data?.repositories ?? []).map(repository => ({
      repository,
      details: repositoryOptionDetails(repository, projectName(repository.linkedProjectId)),
      taken: !!repository.linkedProjectId,
    })),
  );
  // A row of the last search stays on screen, but it cannot be picked until the new answer.
  const selected = $derived(
    repositoriesQuery.isPlaceholderData
      ? undefined
      : options.find(option => option.repository.externalId === chosen && !option.taken),
  );

  return {
    get loadingConnections() {
      return connectionsQuery.isPending;
    },
    get connections() {
      return connections.map(item => ({ id: item.id, label: connectionOptionLabel(item) }));
    },
    get connection() {
      return connection;
    },
    pickConnection: (id: string) => {
      picked = id;
      chosen = '';
      typed = '';
      search = '';
      clearTimeout(timer);
      if (link.isError) link.reset();
    },

    get typed() {
      return typed;
    },
    set typed(value: string) {
      typed = value;
      clearTimeout(timer);
      timer = setTimeout(() => (search = value.trim()), SEARCH_DELAY_MS);
    },
    get searching() {
      return search !== '';
    },

    get loadingRepositories() {
      return !!connection && repositoriesQuery.isPending;
    },
    get options() {
      return options;
    },
    /** True when the provider has more repositories than the first page. */
    get more() {
      return !!repositoriesQuery.data?.nextPageToken;
    },
    get chosen() {
      return chosen;
    },
    choose: (externalId: string) => {
      chosen = externalId;
      if (link.isError) link.reset();
    },

    get linking() {
      return link.isPending;
    },
    get canSubmit() {
      return !!connection && !!selected && !link.isPending;
    },
    get error(): string | null {
      return link.isError ? linkErrorText(link.error) : null;
    },
    submit: () => {
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
