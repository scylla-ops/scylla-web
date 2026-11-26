import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { Permission, authorizationReady, can } from '@platform/authz';
import { contextStore } from '@platform/context';
import { i18n, type MessageDescriptor } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { DEFAULT_PAGE_SIZE, type PaginationParams } from '@scylla/ui/structs';
import {
  movesProject,
  type ProjectGroupChoice,
} from '../domain/entities/project-group.entity.ts';
import type {
  CreateProjectInput,
  ProjectEntity,
  ProjectIconChange,
  ProjectList,
} from '../domain/entities/project.entity.ts';
import type { ProjectSearch } from '../domain/structs/project-search.struct.ts';
import type { ProjectModule } from '../project.module.ts';
import { projectMessages } from './messages/project.messages.ts';
import { keepRecentColor } from './recent-colors.user-state.ts';

// Resolved per call: tests swap the registry.
const domain = () => getModuleDomain<typeof ProjectModule.domain>('project');
const repository = () => domain().projectRepository;

export const PROJECTS_QUERY_KEY = (workspaceId: string | null, pagination?: PaginationParams) =>
  ['projects', workspaceId, pagination] as const;

export const PROJECTS_QUERY_ROOT = ['projects'] as const;

const PROJECT_QUERY_KEY = (projectId: string | undefined) =>
  [...PROJECTS_QUERY_ROOT, 'one', projectId] as const;

/**
 * Every search of the projects of a workspace, under its projects: a write of a project refreshes
 * the searches too. A run changes their health: `pipeline` refreshes them through this key.
 */
export const PROJECT_SEARCHES_QUERY_KEY = (workspaceId: string) =>
  [...PROJECTS_QUERY_ROOT, workspaceId, 'search'] as const;

const PROJECT_SEARCH_QUERY_KEY = (search: ProjectSearch) =>
  [...PROJECT_SEARCHES_QUERY_KEY(search.workspaceId), search] as const;

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

  /**
   * The first projects of a search, scoped by the backend: no client-side gate. While a new
   * search loads, the cards of the last one stay, so that a typed letter or "Show more" does not
   * empty the page. The health of the projects moves with their jobs: it is read each 30 s, as the
   * pipelines of the cards.
   */
  search: (search: ProjectSearch, enabled = true) =>
    queryOptions({
      queryKey: PROJECT_SEARCH_QUERY_KEY(search),
      queryFn: () => repository().search(search),
      enabled: enabled && !!search.workspaceId,
      placeholderData: previous => previous,
      staleTime: 10_000,
      refetchInterval: 30_000,
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

/** `all`: the dashboard, the sidebar and the menus read a list that nothing has mounted now. */
const refetchEveryProjectList = () =>
  getQueryClient().invalidateQueries({ queryKey: PROJECTS_QUERY_ROOT, refetchType: 'all' });

/**
 * Only an entry that a read made: an entry that this write makes has no `queryFn`, and
 * `refetchType: 'all'` fails on it.
 */
const writeReadOfProject = (projectId: string, project: ProjectEntity | null) =>
  getQueryClient().setQueriesData({ queryKey: PROJECT_QUERY_KEY(projectId), exact: true }, project);

/** A free color of a saved icon goes first in the recent colors. */
const keepColorOf = (icon: ProjectIconChange | undefined) => {
  if (icon?.kind === 'glyph') keepRecentColor(icon.color);
};

/**
 * `CreateProject` and `UpdateProject` have no group: the project moves to it just after, last in
 * the group. A new group is created first, after the other groups.
 */
const placeInGroup = async (
  project: ProjectEntity,
  choice: ProjectGroupChoice,
): Promise<ProjectEntity> => {
  const groups = domain().projectGroupRepository;
  const groupId =
    choice.kind === 'new'
      ? (await groups.create(project.workspaceId, choice.name.trim(), choice.color)).id
      : choice.kind === 'group'
        ? choice.id
        : undefined;
  const moved = await groups.move({ id: project.id, groupId });
  if (choice.kind === 'new' && choice.color) keepRecentColor(choice.color);
  return moved;
};

/** The project stays when only its group fails: a toast tells it, with `text`. */
const withGroup = async (
  project: ProjectEntity,
  choice: ProjectGroupChoice | undefined,
  text: (reason: string) => MessageDescriptor,
): Promise<ProjectEntity> => {
  if (!choice || !movesProject(choice, project.groupId)) return project;
  try {
    return await placeInGroup(project, choice);
  } catch (error) {
    toast.error(i18n._(text(ScyllaError.from(error).userMessage())));
    return project;
  }
};

/**
 * `CreateProject` has no icon: it goes in an `UpdateProject` just after, then the group. The
 * project stays when only the icon or the group fails, and a toast tells it.
 */
const createProject = async ({
  name,
  workspaceId,
  description,
  icon,
  group,
}: CreateProjectInput): Promise<ProjectEntity> => {
  let project = await repository().create(name, workspaceId, description);
  if (icon) {
    try {
      project = await repository().setIcon(project.id, icon);
    } catch (error) {
      toast.error(i18n._(projectMessages.iconNotSaved(ScyllaError.from(error).userMessage())));
    }
  }
  return withGroup(project, group, projectMessages.groupNotSaved);
};

export const projectMutations = {
  create: () =>
    mutationOptions({
      mutationKey: CREATE_PROJECT_MUTATION_KEY,
      mutationFn: (input: CreateProjectInput) => createProject(input),
      onSuccess: (created, { icon }) => {
        toast.success(i18n._(ToastMessages.PROJECT_CREATE));
        if (created.icon) keepColorOf(icon);
        return invalidateProjects();
      },
    }),

  /**
   * The icon goes in the same `UpdateProject` as the name and the description. A new group moves
   * the project just after, last in that group, as « Move to group ».
   */
  update: () =>
    mutationOptions({
      mutationFn: async ({
        projectId,
        name,
        description,
        icon,
        group,
      }: {
        projectId: string;
        name?: string;
        description?: string;
        icon?: ProjectIconChange;
        group?: ProjectGroupChoice;
      }) =>
        withGroup(
          await repository().update(projectId, name, description, icon),
          group,
          projectMessages.groupNotMoved,
        ),
      onSuccess: (updated, { icon }) => {
        toast.success(i18n._(ToastMessages.PROJECT_UPDATE));
        keepColorOf(icon);
        // No `cleanContext` is mounted on the list, and the search bar shows the stored name there.
        const { project, setProject } = contextStore.getState();
        if (project.id === updated.id) setProject(updated.id, updated.name);
        writeReadOfProject(updated.id, updated);
        return refetchEveryProjectList();
      },
    }),

  /** The card, the sidebar and the page of the project show the new icon. */
  setIcon: () =>
    mutationOptions({
      mutationFn: ({ projectId, icon }: { projectId: string; icon: ProjectIconChange }) =>
        repository().setIcon(projectId, icon),
      onSuccess: updated => {
        toast.success(i18n._(projectMessages.iconSaved));
        writeReadOfProject(updated.id, updated);
        return refetchEveryProjectList();
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
