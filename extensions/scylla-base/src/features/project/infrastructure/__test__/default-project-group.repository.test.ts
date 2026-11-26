// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IProjectGroupServiceClient } from '@base/generated/scylla/projects/v1/project_group_service.client.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultProjectGroupRepository } from '../default-project-group.repository.ts';

const group = (id: string) => ({
  id: { value: id },
  workspaceId: { value: 'ws-1' },
  createdBy: { value: 'u-1' },
  name: `Group ${id}`,
});

const repositoryWith = (client: Record<string, unknown>) =>
  new DefaultProjectGroupRepository(client as unknown as IProjectGroupServiceClient);

describe('DefaultProjectGroupRepository', () => {
  it('reads each page of the groups of a workspace, in their order', async () => {
    const listProjectGroups = vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { groups: [group('a')], page: { nextToken: 't' } }
          : { groups: [group('b')], page: { nextToken: '' } },
      ),
    );

    const groups = await repositoryWith({ listProjectGroups }).list('ws-1');

    expect(groups).toEqual([
      { id: 'a', workspaceId: 'ws-1', name: 'Group a' },
      { id: 'b', workspaceId: 'ws-1', name: 'Group b' },
    ]);
    expect(listProjectGroups).toHaveBeenLastCalledWith({
      workspaceId: { value: 'ws-1' },
      page: { size: 100, token: 't' },
    });
  });

  it('moves a project out of the groups when no group is given, and gives the project', async () => {
    const moveProject = vi.fn(() =>
      unaryCall({
        project: {
          id: { value: 'p-1' },
          workspaceId: { value: 'ws-1' },
          name: 'web',
          description: '',
        },
      }),
    );

    const project = await repositoryWith({ moveProject }).move({ id: 'p-1', beforeId: 'p-2' });

    expect(moveProject).toHaveBeenCalledWith({
      projectId: { value: 'p-1' },
      groupId: undefined,
      beforeProjectId: { value: 'p-2' },
    });
    expect(project).toEqual({ id: 'p-1', workspaceId: 'ws-1', name: 'web', description: '' });
  });

  it('sends a new place of a group, from 0', async () => {
    const updateProjectGroup = vi.fn(() => unaryCall({ group: group('a') }));

    await repositoryWith({ updateProjectGroup }).reorder('a', -1);

    expect(updateProjectGroup).toHaveBeenCalledWith({ groupId: { value: 'a' }, position: 0 });
  });
});
