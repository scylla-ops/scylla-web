import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { Permission, authorizationReady, can } from '@platform/authz';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import { DEFAULT_PAGE_SIZE, type PaginationParams } from '@scylla/ui/structs';
import type { ProjectEntity } from '../domain/entities/project.entity.ts';
import type { ProjectModule } from '../project.module.ts';

// Resolved per call: tests swap the registry.
const repository = () => getModuleDomain<typeof ProjectModule.domain>('project').projectRepository;

export const PROJECTS_QUERY_KEY = (organizationId: string | null, pagination?: PaginationParams) =>
  ['projects', organizationId, pagination] as const;

export const PROJECTS_QUERY_ROOT = ['projects'] as const;

export const CREATE_PROJECT_MUTATION_KEY = ['project', 'create'] as const;

/** One request for an organization's whole list, for the lookups by name. */
export const PROJECTS_LOOKUP_PAGE: PaginationParams = { page: 1, pageSize: 100 };

export const PROJECT_MEMBERS_QUERY_KEY = (projectId: string) =>
  ['projects', projectId, 'members'] as const;

const FIRST_PAGE: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE };

/** Used outside this module's route guard, so checked here. An empty list is then not proof of "no projects". */
export const canListProjects = (organizationId: string | null): boolean =>
  authorizationReady() &&
  !!organizationId &&
  can(Permission.LIST_PROJECTS_BY_ORGANIZATION, { organizationId });

export const projectQueries = {
  byOrganization: (organizationId: string | null, pagination: PaginationParams = FIRST_PAGE) =>
    queryOptions({
      queryKey: PROJECTS_QUERY_KEY(organizationId, pagination),
      queryFn: () => repository().getByOrganizationId(organizationId!, pagination),
      enabled: canListProjects(organizationId),
    }),

  /** The whole list, scoped by the backend: no client-side gate. */
  lookup: (organizationId: string | null) =>
    queryOptions({
      queryKey: PROJECTS_QUERY_KEY(organizationId, PROJECTS_LOOKUP_PAGE),
      queryFn: () => repository().getByOrganizationId(organizationId!, PROJECTS_LOOKUP_PAGE),
      enabled: !!organizationId,
      staleTime: 30_000,
    }),

  /** Derived from grants: callers invalidate it with `invalidateProjectMembers`. */
  members: (projectId: string | null, options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: PROJECT_MEMBERS_QUERY_KEY(projectId ?? ''),
      queryFn: () => repository().listMembers(projectId!),
      enabled: (options.enabled ?? true) && !!projectId,
    }),
};

export interface ProjectLookupEntry {
  name: string;
  organizationId: string;
}

/**
 * projectId → name and organization, across organizations. Asks only the
 * organizations the user may list (one denial each otherwise). Shares `PROJECTS_QUERY_KEY`.
 */
export const projectLookupQueries = (organizationIds: string[], enabled = true) => {
  const readableIds =
    enabled && authorizationReady()
      ? organizationIds.filter(organizationId =>
          can(Permission.LIST_PROJECTS_BY_ORGANIZATION, { organizationId }),
        )
      : [];

  return {
    queries: readableIds.map(organizationId => projectQueries.lookup(organizationId)),
    // Folded here so TanStack Query memoizes it on the results.
    combine: (results: { data?: { projects: ProjectEntity[] } }[]) => {
      const byProjectId = new Map<string, ProjectLookupEntry>();
      results.forEach((result, index) => {
        const organizationId = readableIds[index];
        for (const project of result.data?.projects ?? []) {
          byProjectId.set(project.id, { name: project.name, organizationId });
        }
      });
      return byProjectId;
    },
  };
};

export const invalidateProjectMembers = (projectId: string | null): void => {
  if (!projectId) return;
  void getQueryClient().invalidateQueries({
    queryKey: PROJECT_MEMBERS_QUERY_KEY(projectId),
    exact: true,
  });
};

const invalidateProjects = () =>
  getQueryClient().invalidateQueries({ queryKey: PROJECTS_QUERY_ROOT });

export const projectMutations = {
  create: () =>
    mutationOptions({
      mutationKey: CREATE_PROJECT_MUTATION_KEY,
      mutationFn: ({
        name,
        organizationId,
        description,
      }: {
        name: string;
        organizationId: string;
        description?: string;
      }) => repository().create(name, organizationId, description),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.PROJECT_CREATE));
        return invalidateProjects();
      },
    }),

  update: () =>
    mutationOptions({
      mutationFn: ({
        projectId,
        name,
        description,
      }: {
        projectId: string;
        name?: string;
        description?: string;
      }) => repository().update(projectId, name, description),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.PROJECT_UPDATE));
        return invalidateProjects();
      },
    }),

  remove: () =>
    mutationOptions({
      mutationFn: (projectId: string) => repository().delete(projectId),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.PROJECT_DELETE));
        return invalidateProjects();
      },
    }),
};
