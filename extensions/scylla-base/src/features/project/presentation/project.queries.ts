import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { Permission, authorizationReady, can } from '@platform/authz';
import { contextStore } from '@platform/context';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import { DEFAULT_PAGE_SIZE, type PaginationParams } from '@scylla/ui/structs';
import type { ProjectEntity, ProjectList } from '../domain/entities/project.entity.ts';
import type { ProjectModule } from '../project.module.ts';

// Resolved per call: tests swap the registry.
const repository = () => getModuleDomain<typeof ProjectModule.domain>('project').projectRepository;

export const PROJECTS_QUERY_KEY = (workspaceId: string | null, pagination?: PaginationParams) =>
  ['projects', workspaceId, pagination] as const;

export const PROJECTS_QUERY_ROOT = ['projects'] as const;

const PROJECT_QUERY_KEY = (projectId: string | undefined) =>
  [...PROJECTS_QUERY_ROOT, 'one', projectId] as const;

export const CREATE_PROJECT_MUTATION_KEY = ['project', 'create'] as const;

/** A workspace's whole list: the repository reads each page, then cuts this one from them. */
export const PROJECTS_LOOKUP_PAGE: PaginationParams = {
  page: 1,
  pageSize: Number.MAX_SAFE_INTEGER,
};

const FIRST_PAGE: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE };

/** Used outside this module's route guard, so checked here. An empty list is then not proof of "no projects". */
export const canListProjects = (workspaceId: string | null): boolean =>
  authorizationReady() &&
  !!workspaceId &&
  can(Permission.LIST_PROJECTS_BY_WORKSPACE, { workspaceId });

export const projectQueries = {
  /** Scoped by the backend: a reader of the workspace with no right on the projects gets the projects of its project roles. */
  byWorkspace: (workspaceId: string | null, pagination: PaginationParams = FIRST_PAGE) =>
    queryOptions({
      queryKey: PROJECTS_QUERY_KEY(workspaceId, pagination),
      queryFn: () => repository().getByWorkspaceId(workspaceId!, pagination),
      enabled: !!workspaceId,
    }),

  /** The whole list, scoped by the backend: no client-side gate. */
  lookup: (workspaceId: string | null) =>
    queryOptions({
      queryKey: PROJECTS_QUERY_KEY(workspaceId, PROJECTS_LOOKUP_PAGE),
      queryFn: () => repository().getByWorkspaceId(workspaceId!, PROJECTS_LOOKUP_PAGE),
      enabled: !!workspaceId,
      staleTime: 30_000,
    }),

  /** One project, scoped by the backend: no client-side gate. Gives `null`, see the repository. */
  byId: (projectId: string | undefined) =>
    queryOptions({
      queryKey: PROJECT_QUERY_KEY(projectId),
      queryFn: () => repository().getById(projectId!),
      enabled: !!projectId,
    }),
};

export interface ProjectLookupEntry {
  name: string;
  workspaceId: string;
}

/**
 * projectId → name and workspace, across workspaces. Asks only the
 * workspaces the user may list (one denial each otherwise). Shares `PROJECTS_QUERY_KEY`.
 */
export const projectLookupQueries = (workspaceIds: string[], enabled = true) => {
  const readableIds =
    enabled && authorizationReady()
      ? workspaceIds.filter(workspaceId =>
          can(Permission.LIST_PROJECTS_BY_WORKSPACE, { workspaceId }),
        )
      : [];

  return {
    queries: readableIds.map(workspaceId => projectQueries.lookup(workspaceId)),
    // Folded here so TanStack Query memoizes it on the results.
    combine: (results: { data?: ProjectList }[]) => {
      const byProjectId = new Map<string, ProjectLookupEntry>();
      results.forEach((result, index) => {
        const workspaceId = readableIds[index];
        for (const project of result.data?.items ?? []) {
          byProjectId.set(project.id, { name: project.name, workspaceId });
        }
      });
      return byProjectId;
    },
  };
};

const invalidateProjects = () =>
  getQueryClient().invalidateQueries({ queryKey: PROJECTS_QUERY_ROOT });

/**
 * Only an entry that a read made: an entry that this write makes has no `queryFn`, and
 * `refetchType: 'all'` fails on it.
 */
const writeReadOfProject = (projectId: string, project: ProjectEntity | null) =>
  getQueryClient().setQueriesData({ queryKey: PROJECT_QUERY_KEY(projectId), exact: true }, project);

export const projectMutations = {
  create: () =>
    mutationOptions({
      mutationKey: CREATE_PROJECT_MUTATION_KEY,
      mutationFn: ({
        name,
        workspaceId,
        description,
      }: {
        name: string;
        workspaceId: string;
        description?: string;
      }) => repository().create(name, workspaceId, description),
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
      onSuccess: updated => {
        toast.success(i18n._(ToastMessages.PROJECT_UPDATE));
        // No `cleanContext` is mounted on the list, and the search bar shows the stored name there.
        const { project, setProject } = contextStore.getState();
        if (project.id === updated.id) setProject(updated.id, updated.name);
        writeReadOfProject(updated.id, updated);
        // `all`: the dashboard and the menus read a list that nothing has mounted now.
        return getQueryClient().invalidateQueries({
          queryKey: PROJECTS_QUERY_ROOT,
          refetchType: 'all',
        });
      },
    }),

  remove: () =>
    mutationOptions({
      mutationFn: (projectId: string) => repository().delete(projectId),
      onSuccess: (_, projectId) => {
        toast.success(i18n._(ToastMessages.PROJECT_DELETE));
        // No `cleanContext` is mounted on the list, and the search bar reads the store there.
        const { project, setProject, setPipeline } = contextStore.getState();
        if (project.id === projectId) {
          setProject(null, null);
          setPipeline(null, null);
        }
        // A browser back then has its answer at once, and the page of the project does not mount.
        writeReadOfProject(projectId, null);
        return invalidateProjects();
      },
    }),
};
