// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IProjectServiceClient } from '@base/generated/scylla/projects/v1/project_service.client.ts';
import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import { failedCall, unaryCall } from '@test/grpc.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { DefaultProjectRepository } from '../default-project.repository.ts';

/** The error that `create` throws when the server refuses. */
const createRefusedWith = (code: string, message: string): Promise<ScyllaError> =>
  new DefaultProjectRepository(
    { createProject: vi.fn(() => failedCall(code, message)) } as unknown as IProjectServiceClient,
    {} as IAccessServiceClient,
  )
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

describe('DefaultProjectRepository.getByOrganizationId', () => {
  it('reads every page of the workspace, then cuts the asked page', async () => {
    const project = (id: string) => ({ id: { value: id }, name: id, description: '' });
    const listProjects = vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { projects: [project('a'), project('b')], page: { nextToken: 't' } }
          : { projects: [project('c')], page: { nextToken: '' } },
      ),
    );
    const repository = new DefaultProjectRepository(
      { listProjects } as unknown as IProjectServiceClient,
      {} as IAccessServiceClient,
    );

    const list = await repository.getByOrganizationId('ws-1', { page: 2, pageSize: 2 });

    expect(listProjects).toHaveBeenCalledTimes(2);
    expect(list.items.map(item => item.id)).toEqual(['c']);
    expect(list.pagination.totalCount).toBe(3);
  });
});
