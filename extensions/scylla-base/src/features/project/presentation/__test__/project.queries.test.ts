// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import { setDependencyRegistry, setQueryClient } from '@scylla/core-sdk';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { runMutationFn, runOnSuccess, runQueryFn } from '@test/queries.ts';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type { ProjectRepository } from '@base/features/project/domain/repository/project.repository.ts';
import { DefaultProjectRepository } from '@base/features/project/infrastructure/default-project.repository.ts';
import type { IProjectServiceClient } from '@base/generated/scylla/projects/v1/project_service.client.ts';
import { unaryCall } from '@test/grpc.ts';
import {
  canListProjects,
  projectLookupQueries,
  projectMutations,
  projectQueries,
  PROJECTS_LOOKUP_PAGE,
  PROJECTS_QUERY_KEY,
  PROJECTS_QUERY_ROOT,
} from '../project.queries.ts';

const toastSuccess = vi.fn();
vi.mock('svelte-sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args) },
}));

const project = (overrides: Partial<ProjectEntity> = {}): ProjectEntity => ({
  id: 'project-1',
  name: 'web',
  description: 'the web app',
  ...overrides,
});

const page = (projects: ProjectEntity[]) => ({
  items: projects,
  pagination: {
    page: 1,
    pageSize: 10,
    totalCount: projects.length,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
});

const withRepository = (overrides: Partial<ProjectRepository> = {}) => {
  const repository = {
    getByWorkspaceId: vi.fn().mockResolvedValue(page([project()])),
    create: vi.fn().mockResolvedValue(project()),
    update: vi.fn().mockResolvedValue(project()),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  setDependencyRegistry({ project: { projectRepository: repository } });
  return repository;
};

const grantEverything = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });

const grantNothing = () => permissionsStore.setState({ permissions: { scopes: [] } });
const forgetPermissions = () => permissionsStore.setState({ permissions: null });

let queryClient: QueryClient;

beforeEach(() => {
  toastSuccess.mockClear();
  grantEverything();
  queryClient = new QueryClient();
  setQueryClient(queryClient);
});

afterEach(() => {
  contextStore.getState().reset();
  setDependencyRegistry(null);
  setQueryClient(null);
  forgetPermissions();
});

describe('canListProjects', () => {
  it('denies while the permissions are still unknown', () => {
    forgetPermissions();
    expect(canListProjects('org-1')).toBe(false);
  });

  it('denies without LIST_PROJECTS_BY_WORKSPACE', () => {
    grantNothing();
    expect(canListProjects('org-1')).toBe(false);
  });

  it('denies without a workspace', () => {
    expect(canListProjects(null)).toBe(false);
  });
});

describe('projectQueries.byWorkspace', () => {
  it('fetches the first page for the given workspace', async () => {
    const repository = withRepository();

    const result = await runQueryFn(projectQueries.byWorkspace('org-1'));

    expect(repository.getByWorkspaceId).toHaveBeenCalledWith('org-1', {
      page: 1,
      pageSize: expect.any(Number) as number,
    });
    expect(result.items).toHaveLength(1);
  });

  it('never asks for a list it may not read', () => {
    grantNothing();
    withRepository();
    expect(projectQueries.byWorkspace('org-1').enabled).toBe(false);
  });

  it('is disabled without a workspace', () => {
    withRepository();
    expect(projectQueries.byWorkspace(null).enabled).toBe(false);
  });

  it('keys each page separately, so a page change is a new cache entry', () => {
    withRepository();
    const first = projectQueries.byWorkspace('org-1', { page: 1, pageSize: 10 }).queryKey;
    const second = projectQueries.byWorkspace('org-1', { page: 2, pageSize: 10 }).queryKey;

    expect(first).not.toEqual(second);
  });
});

describe('projectQueries.lookup', () => {
  it('keeps each project, also after the 100th: a search reads this list', async () => {
    const projects = Array.from({ length: 150 }, (_, index) => ({
      id: { value: `project-${index}` },
      name: `project-${index}`,
      description: '',
    }));
    setDependencyRegistry({
      project: {
        projectRepository: new DefaultProjectRepository({
          listProjects: vi.fn(() => unaryCall({ projects, page: { nextToken: '' } })),
        } as unknown as IProjectServiceClient),
      },
    });

    const list = await runQueryFn(projectQueries.lookup('org-1'));

    expect(list.items).toHaveLength(150);
    expect(list.pagination.totalPages).toBe(1);
  });

  it('asks for the whole list in one page', async () => {
    const repository = withRepository();

    await runQueryFn(projectQueries.lookup('org-1'));

    expect(repository.getByWorkspaceId).toHaveBeenCalledWith('org-1', PROJECTS_LOOKUP_PAGE);
  });

  it('shares its cache entry with the fan-out lookup for the same workspace', () => {
    withRepository();

    expect(projectQueries.lookup('org-1').queryKey).toEqual(
      PROJECTS_QUERY_KEY('org-1', PROJECTS_LOOKUP_PAGE),
    );
  });

  it('is disabled without a workspace', () => {
    withRepository();
    expect(projectQueries.lookup(null).enabled).toBe(false);
  });
});

describe('projectLookupQueries', () => {
  it('skips the workspaces the caller may not read rather than collecting denials', () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.WORKSPACE,
            scopeId: 'org-1',
            access: { kind: 'restricted', permissions: [Permission.LIST_PROJECTS_BY_WORKSPACE] },
          },
        ],
      },
    });
    withRepository();

    const { queries } = projectLookupQueries(['org-1', 'org-2']);

    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(PROJECTS_QUERY_KEY('org-1', PROJECTS_LOOKUP_PAGE));
  });

  it('queries nothing when disabled', () => {
    withRepository();
    expect(projectLookupQueries(['org-1'], false).queries).toHaveLength(0);
  });

  it('combines results into a projectId -> {name, workspaceId} map', () => {
    withRepository();
    const { combine } = projectLookupQueries(['org-1', 'org-2']);

    const map = combine([
      { data: page([project({ id: 'p-1', name: 'web' })]) },
      { data: page([project({ id: 'p-2', name: 'api' })]) },
    ]);

    expect(map.get('p-1')).toEqual({ name: 'web', workspaceId: 'org-1' });
    expect(map.get('p-2')).toEqual({ name: 'api', workspaceId: 'org-2' });
  });

  it('keeps each result attached to the workspace it came from when some are skipped', () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.WORKSPACE,
            scopeId: 'org-2',
            access: { kind: 'restricted', permissions: [Permission.LIST_PROJECTS_BY_WORKSPACE] },
          },
        ],
      },
    });
    withRepository();

    const { combine } = projectLookupQueries(['org-1', 'org-2']);
    const map = combine([{ data: page([project({ id: 'p-2' })]) }]);

    // The indexes follow the readable ids, not the requested ones.
    expect(map.get('p-2')?.workspaceId).toBe('org-2');
  });
});

describe('the mutations', () => {
  it('create scopes the project to the workspace, toasts and invalidates the projects root', async () => {
    const repository = withRepository();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await runMutationFn(projectMutations.create(), {
      name: 'web',
      workspaceId: 'org-1',
      description: 'd',
    });
    runOnSuccess(projectMutations.create(), project(), { name: 'web', workspaceId: 'org-1' });

    expect(repository.create).toHaveBeenCalledWith('web', 'org-1', 'd');
    expect(toastSuccess).toHaveBeenCalledWith('Project created');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PROJECTS_QUERY_ROOT });
  });

  it('update sends only what changed and refetches each list, also one that nothing has mounted', async () => {
    const repository = withRepository();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await runMutationFn(projectMutations.update(), { projectId: 'project-9', name: 'renamed' });
    runOnSuccess(projectMutations.update(), project(), { projectId: 'project-9' });

    expect(repository.update).toHaveBeenCalledWith('project-9', 'renamed', undefined);
    expect(toastSuccess).toHaveBeenCalledWith('Project updated');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: PROJECTS_QUERY_ROOT,
      refetchType: 'all',
    });
  });

  it('update gives the store the new name of the active project', () => {
    withRepository();
    contextStore.setState({ project: { id: 'project-1', name: 'web' } });

    runOnSuccess(projectMutations.update(), project({ name: 'renamed' }), {
      projectId: 'project-1',
    });

    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'renamed' });
  });

  it('update leaves the store when another project is active', () => {
    withRepository();
    contextStore.setState({ project: { id: 'project-2', name: 'api' } });

    runOnSuccess(projectMutations.update(), project({ name: 'renamed' }), {
      projectId: 'project-1',
    });

    expect(contextStore.getState().project).toEqual({ id: 'project-2', name: 'api' });
  });

  it('remove deletes and invalidates the projects root', async () => {
    const repository = withRepository();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await runMutationFn(projectMutations.remove(), 'project-9');
    runOnSuccess(projectMutations.remove(), undefined, 'project-9');

    expect(repository.delete).toHaveBeenCalledWith('project-9');
    expect(toastSuccess).toHaveBeenCalledWith('Project deleted');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PROJECTS_QUERY_ROOT });
  });
});
