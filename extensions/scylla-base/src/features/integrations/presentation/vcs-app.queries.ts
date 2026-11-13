import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type {
  CompleteGitHubManifestInput,
  VcsAppEntity,
} from '../domain/entities/vcs-app.entity.ts';
import type { IntegrationsModule } from '../integrations.module.ts';
import { ALL_VCS_CONNECTIONS_QUERY_KEY } from './vcs-connection.queries.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof IntegrationsModule.domain>('integrations').vcsAppRepository;

export const VCS_APP_QUERY_KEY = ['vcs-app'] as const;

/** The App changes what a workspace can connect, and the state of its GitHub connections. */
const keep = (app: VcsAppEntity | null) => {
  const client = getQueryClient();
  client.setQueryData(VCS_APP_QUERY_KEY, app);
  return client.invalidateQueries({ queryKey: ALL_VCS_CONNECTIONS_QUERY_KEY });
};

export const vcsAppQueries = {
  get: () =>
    queryOptions({
      queryKey: VCS_APP_QUERY_KEY,
      queryFn: () => repository().get(),
      staleTime: 30 * 1000,
    }),
};

export const vcsAppMutations = {
  /** The page posts the manifest to GitHub. A refusal shows beside the button. */
  startGitHubManifest: () =>
    mutationOptions({
      mutationFn: (organization: string) => repository().startGitHubManifest(organization),
      meta: { showsOwnError: true },
    }),

  /** The callback page shows the refusal itself, with the words of the flow. */
  completeGitHubManifest: () =>
    mutationOptions({
      mutationFn: (input: CompleteGitHubManifestInput) =>
        repository().completeGitHubManifest(input),
      onSuccess: app => keep(app),
      meta: { showsOwnError: true },
    }),

  remove: () =>
    mutationOptions({
      mutationFn: () => repository().remove(),
      onSuccess: () => keep(null),
    }),
};
