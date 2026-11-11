import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type {
  CompleteGitHubInstallInput,
  ConnectGitLabInput,
  ReplaceGitLabTokenInput,
} from '../domain/entities/vcs-connection.entity.ts';
import type { ListProviderRepositoriesInput } from '../domain/repository/vcs-connection.repository.ts';
import type { IntegrationsModule } from '../integrations.module.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof IntegrationsModule.domain>('integrations').vcsConnectionRepository;

export const ALL_VCS_CONNECTIONS_QUERY_KEY = ['vcs-connections'] as const;
export const VCS_CONNECTIONS_QUERY_KEY = (workspaceId: string) =>
  [...ALL_VCS_CONNECTIONS_QUERY_KEY, workspaceId] as const;
const VCS_PROVIDERS_QUERY_KEY = (workspaceId: string) =>
  [...VCS_CONNECTIONS_QUERY_KEY(workspaceId), 'providers'] as const;
const PROVIDER_REPOSITORIES_QUERY_KEY = (input: ListProviderRepositoriesInput) =>
  [
    ...ALL_VCS_CONNECTIONS_QUERY_KEY,
    'repositories',
    input.connectionId,
    input.projectId,
    input.search ?? '',
    input.pageToken ?? '',
  ] as const;

const invalidate = (workspaceId: string) =>
  getQueryClient().invalidateQueries({ queryKey: VCS_CONNECTIONS_QUERY_KEY(workspaceId) });

export const vcsConnectionQueries = {
  providers: (workspaceId: string) =>
    queryOptions({
      queryKey: VCS_PROVIDERS_QUERY_KEY(workspaceId),
      queryFn: () => repository().getProviders(workspaceId),
      enabled: !!workspaceId,
      staleTime: 5 * 60 * 1000,
    }),

  byWorkspace: (workspaceId: string) =>
    queryOptions({
      queryKey: [...VCS_CONNECTIONS_QUERY_KEY(workspaceId), 'list'] as const,
      queryFn: () => repository().listByWorkspace(workspaceId),
      enabled: !!workspaceId,
      staleTime: 30 * 1000,
    }),

  repositories: (input: ListProviderRepositoriesInput, enabled = true) =>
    queryOptions({
      queryKey: PROVIDER_REPOSITORIES_QUERY_KEY(input),
      queryFn: () => repository().listRepositories(input),
      enabled: enabled && !!input.projectId && !!input.connectionId,
      staleTime: 30 * 1000,
    }),
};

export const vcsConnectionMutations = {
  /** The browser leaves for GitHub, which sends it back to the callback page. */
  startGitHubInstall: () =>
    mutationOptions({
      mutationFn: (workspaceId: string) => repository().startGitHubInstall(workspaceId),
      onSuccess: install => window.location.assign(install.installUrl),
    }),

  /** The callback page shows the refusal itself, with the words of the flow. */
  completeGitHubInstall: () =>
    mutationOptions({
      mutationFn: (input: CompleteGitHubInstallInput) => repository().completeGitHubInstall(input),
      onSuccess: connection => invalidate(connection.workspaceId),
      meta: { showsOwnError: true },
    }),

  /** The dialog shows a refusal of the token beside the field. */
  connectGitLab: () =>
    mutationOptions({
      mutationFn: (input: ConnectGitLabInput) => repository().connectGitLab(input),
      onSuccess: (_result, input) => invalidate(input.workspaceId),
      meta: { showsOwnError: true },
    }),

  replaceGitLabToken: (workspaceId: string) =>
    mutationOptions({
      mutationFn: (input: ReplaceGitLabTokenInput) => repository().replaceGitLabToken(input),
      onSuccess: () => invalidate(workspaceId),
      meta: { showsOwnError: true },
    }),

  remove: (workspaceId: string) =>
    mutationOptions({
      mutationFn: (id: string) => repository().deleteById(id),
      onSuccess: () => invalidate(workspaceId),
    }),
};
