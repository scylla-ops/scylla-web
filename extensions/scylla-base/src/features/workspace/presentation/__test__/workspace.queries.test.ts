// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import { setDependencyRegistry, setQueryClient } from '@scylla/core-sdk';
import { contextStore } from '@platform/context';
import { runMutationFn, runOnSuccess, runQueryFn } from '@test/queries.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
import type { WorkspaceRepository } from '@base/features/workspace/domain/repository/workspace.repository.ts';
import {
  invalidateWorkspaceMembers,
  workspaceMutations,
  workspaceQueries,
  MY_WORKSPACES_QUERY_KEY,
  WORKSPACES_QUERY_KEY,
  WORKSPACE_MEMBERS_QUERY_KEY,
} from '../workspace.queries.ts';

const toastSuccess = vi.fn();
vi.mock('svelte-sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args) },
}));

const WORKSPACE_ID = 'org-1';

const org = (overrides: Partial<WorkspaceEntity> = {}): WorkspaceEntity => ({
  id: WORKSPACE_ID,
  name: 'Scylla Inc',
  slug: 'scylla-inc',
  personalTokensEnabled: true,
  ...overrides,
});

const withRepository = (overrides: Partial<WorkspaceRepository> = {}) => {
  const repository = {
    getMine: vi.fn().mockResolvedValue([org()]),
    listMembers: vi.fn().mockResolvedValue([{ id: 'user-1', username: 'ravenne' }]),
    create: vi.fn().mockResolvedValue(org()),
    update: vi.fn().mockResolvedValue(org()),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  setDependencyRegistry({ workspace: { workspaceRepository: repository } });
  return repository;
};

let queryClient: QueryClient;

beforeEach(() => {
  toastSuccess.mockClear();
  contextStore.getState().reset();
  queryClient = new QueryClient();
  setQueryClient(queryClient);
});

afterEach(() => {
  setDependencyRegistry(null);
  setQueryClient(null);
});

describe('workspaceQueries.mine', () => {
  it('asks for the workspaces the user belongs to', async () => {
    const repository = withRepository();

    const workspaces = await runQueryFn(workspaceQueries.mine());

    expect(repository.getMine).toHaveBeenCalled();
    expect(workspaces).toHaveLength(1);
  });

  it('surfaces a failure for the query to own', async () => {
    const error = new ScyllaError('boom', { code: 'INTERNAL' });
    withRepository({ getMine: vi.fn().mockRejectedValue(error) });

    await expect(runQueryFn(workspaceQueries.mine())).rejects.toBe(error);
  });
});

describe('workspaceQueries.members', () => {
  it('lists members for the given workspace', async () => {
    const repository = withRepository();

    const members = await runQueryFn(workspaceQueries.members(WORKSPACE_ID));

    expect(repository.listMembers).toHaveBeenCalledWith(WORKSPACE_ID);
    expect(members).toHaveLength(1);
  });

  it('is disabled without a workspace id', () => {
    withRepository();
    expect(workspaceQueries.members(null).enabled).toBe(false);
  });

  it('is disabled when the caller says so, even with a valid id', () => {
    withRepository();
    expect(workspaceQueries.members(WORKSPACE_ID, { enabled: false }).enabled).toBe(false);
  });
});

describe('invalidateWorkspaceMembers', () => {
  it("invalidates exactly this workspace's members key", () => {
    withRepository();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateWorkspaceMembers(WORKSPACE_ID);

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: WORKSPACE_MEMBERS_QUERY_KEY(WORKSPACE_ID),
      exact: true,
    });
  });

  it('is a no-op without a workspace id', () => {
    withRepository();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateWorkspaceMembers(null);

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('workspaceMutations.create', () => {
  it('creates the workspace', async () => {
    const repository = withRepository();

    await runMutationFn(workspaceMutations.create(), { name: 'New Org', slug: 'd' });

    expect(repository.create).toHaveBeenCalledWith('New Org', 'd');
  });

  it('switches the active context to it, toasts and invalidates the list', () => {
    withRepository();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    runOnSuccess(workspaceMutations.create(), org({ id: 'org-new', name: 'New Org' }), {
      name: 'New Org',
    });

    expect(contextStore.getState().workspace).toEqual({
      id: 'org-new',
      name: 'New Org',
      slug: 'scylla-inc',
    });
    expect(toastSuccess).toHaveBeenCalledWith('Workspace created');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: WORKSPACES_QUERY_KEY() });
  });
});

describe('workspaceMutations.update', () => {
  it('updates and toasts', async () => {
    const repository = withRepository();

    await runMutationFn(workspaceMutations.update(), {
      workspaceId: WORKSPACE_ID,
      name: 'Renamed',
    });
    runOnSuccess(workspaceMutations.update(), org(), { workspaceId: WORKSPACE_ID });

    expect(repository.update).toHaveBeenCalledWith(WORKSPACE_ID, 'Renamed', undefined);
    expect(toastSuccess).toHaveBeenCalledWith('Workspace updated');
  });

  it('invalidates the list and the data of other features, which also hold the name', () => {
    withRepository();
    queryClient.setQueryData(MY_WORKSPACES_QUERY_KEY(), [org()]);
    queryClient.setQueryData(['members', 'workspace', WORKSPACE_ID], [{ scopeName: 'Scylla Inc' }]);

    runOnSuccess(workspaceMutations.update(), org(), { workspaceId: WORKSPACE_ID });

    expect(queryClient.getQueryState(MY_WORKSPACES_QUERY_KEY())?.isInvalidated).toBe(true);
    expect(
      queryClient.getQueryState(['members', 'workspace', WORKSPACE_ID])?.isInvalidated,
    ).toBe(true);
  });
});

describe('workspaceMutations.remove', () => {
  it('deletes, toasts and invalidates the list', async () => {
    const repository = withRepository();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await runMutationFn(workspaceMutations.remove(), WORKSPACE_ID);
    runOnSuccess(workspaceMutations.remove(), undefined, WORKSPACE_ID);

    expect(repository.delete).toHaveBeenCalledWith(WORKSPACE_ID);
    expect(toastSuccess).toHaveBeenCalledWith('Workspace deleted');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: WORKSPACES_QUERY_KEY() });
  });
});
