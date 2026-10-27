// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IProjectServiceClient } from '@base/generated/scylla/project/v1/project.client.ts';
import { failedCall } from '@test/grpc.ts';
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
      'organization 01m490 has reached its limit of 3 projects',
    );

    expect(error.userMessage()).toBe('This organization has reached its project limit.');
    expect(error.code).toBe('RESOURCE_EXHAUSTED');
  });

  it('passes any other error through as it is', async () => {
    const error = await createRefusedWith('INVALID_ARGUMENT', 'name is required');

    expect(error.code).toBe('INVALID_ARGUMENT');
    expect(error.userMessage()).toBe('name is required');
  });
});
