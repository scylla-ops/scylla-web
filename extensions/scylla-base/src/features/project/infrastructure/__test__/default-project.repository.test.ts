// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IProjectServiceClient } from '@base/generated/scylla/projects/v1/project_service.client.ts';
import {
  ProjectHealth,
  ProjectOrder,
} from '@base/generated/scylla/projects/v1/project_service.ts';
import { failedCall, unaryCall } from '@test/grpc.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { DefaultProjectRepository } from '../default-project.repository.ts';

/** The error that `create` throws when the server refuses. */
const createRefusedWith = (code: string, message: string): Promise<ScyllaError> =>
  new DefaultProjectRepository({
    createProject: vi.fn(() => failedCall(code, message)),
  } as unknown as IProjectServiceClient)
    .create('web', 'org-1')
    .then(
      () => {
        throw new Error('create was not refused');
      },
      (error: unknown) => ScyllaError.from(error),
    );

describe('DefaultProjectRepository.create', () => {
  it('replaces the server text of a project cap, and keeps the code', async () => {
    const error = await createRefusedWith(
      'RESOURCE_EXHAUSTED',
      'workspace 01m490 has reached its limit of 3 projects',
    );

    expect(error.userMessage()).toBe('This workspace has reached its project limit.');
    expect(error.code).toBe('RESOURCE_EXHAUSTED');
  });

  it('passes any other error through as it is', async () => {
    const error = await createRefusedWith('INVALID_ARGUMENT', 'name is required');

    expect(error.code).toBe('INVALID_ARGUMENT');
    expect(error.userMessage()).toBe('name is required');
  });
});

describe('DefaultProjectRepository.setIcon', () => {
  it('sends only the icon in the update, and gives the project that the server answers', async () => {
    const updateProject = vi.fn(() =>
      unaryCall({
        project: {
          id: { value: 'p-1' },
          workspaceId: { value: 'ws-1' },
          name: 'web',
          description: '',
          icon: { kind: { oneofKind: 'glyph', glyph: { name: 'rocket', color: '#e879f9' } } },
        },
      }),
    );
    const repository = new DefaultProjectRepository({
      updateProject,
    } as unknown as IProjectServiceClient);

    const project = await repository.setIcon('p-1', {
      kind: 'glyph',
      name: 'rocket',
      color: '#E879F9',
    });

    expect(updateProject).toHaveBeenCalledWith({
      projectId: { value: 'p-1' },
      icon: { kind: { oneofKind: 'glyph', glyph: { name: 'rocket', color: '#E879F9' } } },
    });
    expect(project.icon).toEqual({ kind: 'glyph', name: 'rocket', color: '#e879f9' });
  });
});

describe('DefaultProjectRepository.getById', () => {
  const repositoryWith = (getProject: () => unknown) =>
    new DefaultProjectRepository({ getProject } as unknown as IProjectServiceClient);

  it('asks the server for this one project and tells its workspace', async () => {
    const getProject = vi.fn(() =>
      unaryCall({
        project: { id: { value: 'p-1' }, workspaceId: { value: 'ws-1' }, name: 'web', description: '' },
      }),
    );

    await expect(repositoryWith(getProject).getById('p-1')).resolves.toEqual({
      id: 'p-1',
      workspaceId: 'ws-1',
      name: 'web',
      description: '',
    });
    expect(getProject).toHaveBeenCalledWith({ projectId: { value: 'p-1' } });
  });

  it.each([
    ['an unknown id, which the server answers as a refusal', 'PERMISSION_DENIED'],
    ['a text that is not an id', 'INVALID_ARGUMENT'],
  ])('gives null for %s', async (_, code) => {
    const repository = repositoryWith(() => failedCall(code, 'no'));

    await expect(repository.getById('nope')).resolves.toBeNull();
  });

  it('passes any other error through: an outage does not mean that the project is gone', async () => {
    const repository = repositoryWith(() => failedCall('UNAVAILABLE', 'down'));

    await expect(repository.getById('p-1')).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });
});

describe('DefaultProjectRepository.getByWorkspaceId', () => {
  it('reads every page of the workspace, then cuts the asked page', async () => {
    const project = (id: string) => ({ id: { value: id }, name: id, description: '' });
    const listProjects = vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { projects: [project('a'), project('b')], page: { nextToken: 't' } }
          : { projects: [project('c')], page: { nextToken: '' } },
      ),
    );
    const repository = new DefaultProjectRepository({
      listProjects,
    } as unknown as IProjectServiceClient);

    const list = await repository.getByWorkspaceId('ws-1', { page: 2, pageSize: 2 });

    expect(listProjects).toHaveBeenCalledTimes(2);
    expect(list.items.map(item => item.id)).toEqual(['c']);
    expect(list.pagination.totalCount).toBe(3);
  });
});

describe('DefaultProjectRepository.search', () => {
  const wire = (id: string) => ({
    id: { value: id },
    workspaceId: { value: 'ws-1' },
    name: id,
    description: '',
  });

  it('reads pages of at most 100 projects until it has the limit, with the counts', async () => {
    const counts = { total: 130, failed: 2, running: 1, pipelines: 200 };
    const listProjects = vi
      .fn()
      .mockReturnValueOnce(
        unaryCall({
          projects: Array.from({ length: 100 }, (_, index) => wire(`p-${index}`)),
          page: { nextToken: 't-2' },
          counts,
        }),
      )
      .mockReturnValueOnce(
        unaryCall({ projects: [wire('p-100'), wire('p-101')], page: { nextToken: 't-3' }, counts }),
      );
    const repository = new DefaultProjectRepository({
      listProjects,
    } as unknown as IProjectServiceClient);

    const result = await repository.search({
      workspaceId: 'ws-1',
      query: 'web',
      order: 'failed-first',
      health: 'running',
      limit: 102,
    });

    expect(result.items).toHaveLength(102);
    expect(result.counts).toEqual(counts);
    expect(result.hasMore).toBe(true);
    expect(listProjects).toHaveBeenNthCalledWith(1, {
      workspaceId: { value: 'ws-1' },
      page: { size: 100, token: '' },
      query: 'web',
      order: ProjectOrder.FAILED_FIRST,
      health: ProjectHealth.RUNNING,
    });
    expect(listProjects).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: { size: 2, token: 't-2' } }),
    );
  });

  it('stops at the last page, and reads no counts as an empty list', async () => {
    const listProjects = vi.fn(() => unaryCall({ projects: [wire('p-1')], page: { nextToken: '' } }));
    const repository = new DefaultProjectRepository({
      listProjects,
    } as unknown as IProjectServiceClient);

    const result = await repository.search({
      workspaceId: 'ws-1',
      query: '',
      order: 'name',
      health: 'all',
      limit: 6,
    });

    expect(result.items.map(item => item.id)).toEqual(['p-1']);
    expect(result.hasMore).toBe(false);
    expect(result.counts).toEqual({ total: 0, failed: 0, running: 0, pipelines: 0 });
    expect(listProjects).toHaveBeenCalledTimes(1);
  });
});
