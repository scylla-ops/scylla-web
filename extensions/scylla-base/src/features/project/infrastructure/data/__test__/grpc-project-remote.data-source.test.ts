// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-result.ts';
import { toCreateProjectError } from '../grpc-project-remote.data-source.ts';

const rpcError = (code: string, message: string) =>
  new ScyllaError('Failed to create project.', { cause: Object.assign(new Error(message), { code }) });

describe('toCreateProjectError', () => {
  it('replaces the server text of a project cap, and keeps the code', () => {
    const error = toCreateProjectError(
      rpcError('RESOURCE_EXHAUSTED', 'organization 01m490 has reached its limit of 3 projects'),
    );

    expect(error.userMessage()).toBe('This organization has reached its project limit.');
    expect(error.getCode()).toBe('RESOURCE_EXHAUSTED');
  });

  it('passes any other error through as it is', () => {
    const original = rpcError('INVALID_ARGUMENT', 'name is required');

    expect(toCreateProjectError(original)).toBe(original);
    expect(original.userMessage()).toBe('name is required');
  });
});
