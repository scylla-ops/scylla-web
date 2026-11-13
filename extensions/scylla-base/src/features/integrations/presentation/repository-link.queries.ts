import { Permission, can } from '@platform/authz';
import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type {
  LinkRepositoryInput,
  ListRefsInput,
  UpdateRepositoryLinkInput,
} from '../domain/entities/repository-link.entity.ts';
import type { IntegrationsModule } from '../integrations.module.ts';
import { MERGE_BLOCKS_QUERY_KEY } from './merge-block.queries.ts';
import { ALL_VCS_CONNECTIONS_QUERY_KEY } from './vcs-connection.queries.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof IntegrationsModule.domain>('integrations').repositoryLinkRepository;

export const REPOSITORY_LINK_QUERY_KEY = (projectId: string) =>
  ['repository-link', projectId] as const;
const GIT_REFS_QUERY_KEY = (input: ListRefsInput) =>
  [
    ...REPOSITORY_LINK_QUERY_KEY(input.projectId),
    'refs',
    input.kind ?? 'all',
    input.search ?? '',
    input.pageToken ?? '',
  ] as const;

/** The link changes the merge rules and the connections count too: refresh them all. */
const invalidate = (projectId: string) =>
  Promise.all([
    getQueryClient().invalidateQueries({ queryKey: REPOSITORY_LINK_QUERY_KEY(projectId) }),
    getQueryClient().invalidateQueries({ queryKey: MERGE_BLOCKS_QUERY_KEY(projectId) }),
    getQueryClient().invalidateQueries({ queryKey: ALL_VCS_CONNECTIONS_QUERY_KEY }),
  ]);

/** The pipeline pages read the link and its refs: each read checks its permission itself. */
const canRead = (projectId: string) =>
  !!projectId && can(Permission.READ_REPOSITORY_LINK, { projectId });

export const repositoryLinkQueries = {
  /** `null`: the project has no link. */
  byProject: (projectId: string) =>
    queryOptions({
      queryKey: REPOSITORY_LINK_QUERY_KEY(projectId),
      queryFn: () => repository().getByProject(projectId),
      enabled: canRead(projectId),
      staleTime: 30 * 1000,
    }),

  refs: (input: ListRefsInput, enabled = true) =>
    queryOptions({
      queryKey: GIT_REFS_QUERY_KEY(input),
      queryFn: () => repository().listRefs(input),
      enabled: enabled && canRead(input.projectId),
      staleTime: 30 * 1000,
    }),
};

export const repositoryLinkMutations = {
  link: () =>
    mutationOptions({
      mutationFn: (input: LinkRepositoryInput) => repository().link(input),
      onSuccess: link => invalidate(link.projectId),
    }),

  update: () =>
    mutationOptions({
      mutationFn: (input: UpdateRepositoryLinkInput) => repository().update(input),
      onSuccess: link => invalidate(link.projectId),
    }),

  unlink: () =>
    mutationOptions({
      mutationFn: (projectId: string) => repository().unlink(projectId),
      onSuccess: (_result, projectId) => invalidate(projectId),
    }),

  testDelivery: () =>
    mutationOptions({
      mutationFn: (projectId: string) => repository().testDelivery(projectId),
      onSuccess: (_result, projectId) => invalidate(projectId),
    }),
};
