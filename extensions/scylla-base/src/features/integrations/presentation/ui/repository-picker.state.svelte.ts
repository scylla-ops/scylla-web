import { createQuery } from '@scylla/core-sdk';
import { projectQueries } from '@base/features/project';
import type { ProviderRepository } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import type { VcsProvider } from '@base/features/integrations/domain/structs/vcs-provider.struct.ts';
import {
  connectionOptionLabel,
  repositoryOptionDetails,
} from '@base/features/integrations/presentation/presenters/repository-link.presenter.ts';
import { vcsConnectionQueries } from '@base/features/integrations/presentation/vcs-connection.queries.ts';

/** The time between the last key and the search on the provider. */
const SEARCH_DELAY_MS = 300;

export interface RepositoryPickerParams {
  workspaceId: () => string;
  /** The project to link. With no project, the list is for a project to create. */
  projectId?: () => string;
  /** Only the connections of this provider. */
  provider?: VcsProvider;
  /** The connection to show first, for example the one that the GitHub callback made. */
  connectionId?: string;
  /** A change of the connection or of the repository. */
  onChange?: () => void;
}

/** A repository of the list, as the picker shows it. */
export interface RepositoryOption {
  repository: ProviderRepository;
  details: string;
  /** Another project has it. */
  taken: boolean;
}

/**
 * A connection of the workspace, a search on the provider, one repository. Only an active
 * connection can list its repositories. Construct it during component initialisation.
 */
export const createRepositoryPicker = (params: RepositoryPickerParams) => {
  const connectionsQuery = createQuery(() => vcsConnectionQueries.byWorkspace(params.workspaceId()));
  const projectsQuery = createQuery(() => projectQueries.lookup(params.workspaceId()));

  const connections = $derived(
    (connectionsQuery.data ?? []).filter(
      connection =>
        connection.state === 'active' && (!params.provider || connection.provider === params.provider),
    ),
  );
  let picked = $state(params.connectionId ?? '');
  const connection = $derived(
    connections.find(item => item.id === picked) ?? connections[0] ?? null,
  );

  let typed = $state('');
  let search = $state('');
  let timer: ReturnType<typeof setTimeout> | undefined;

  const target = () =>
    params.projectId ? { projectId: params.projectId() } : { workspaceId: params.workspaceId() };
  const repositoriesQuery = createQuery(() =>
    vcsConnectionQueries.repositories(
      { ...target(), connectionId: connection?.id ?? '', search },
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
    get connectionLabel() {
      return connection ? connectionOptionLabel(connection) : '';
    },
    pickConnection: (id: string) => {
      picked = id;
      chosen = '';
      typed = '';
      search = '';
      clearTimeout(timer);
      params.onChange?.();
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
      params.onChange?.();
    },
    /** The chosen repository, when it can be picked. */
    get selected() {
      return selected;
    },
  };
};

export type RepositoryPicker = ReturnType<typeof createRepositoryPicker>;
