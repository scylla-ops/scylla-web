// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcSecret from '../grpc-secret.mapper.ts';
import type { Secret } from '@base/generated/scylla/secret/v1/secret.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';

describe('grpcSecret.toDomain', () => {
  it('unwraps ids, formats timestamps, never carries the value (metadata only)', () => {
    const secret: Secret = {
      secretId: { value: 'secret-1' },
      projectId: { value: 'project-1' },
      name: 'DATABASE_URL',
      description: 'prod db',
      createdAt: TS,
      updatedAt: TS,
    };
    const domain = grpcSecret.toDomain(secret);
    expect(domain).toEqual({
      id: 'secret-1',
      projectId: 'project-1',
      name: 'DATABASE_URL',
      description: 'prod db',
      createdAt: ISO,
      updatedAt: ISO,
    });
    expect(domain).not.toHaveProperty('value');
  });

  it('defaults to empty ids when the wrappers are absent', () => {
    const secret: Secret = {
      secretId: undefined,
      projectId: undefined,
      name: 'DATABASE_URL',
      description: '',
      createdAt: TS,
      updatedAt: TS,
    };
    const domain = grpcSecret.toDomain(secret);
    expect(domain.id).toBe('');
    expect(domain.projectId).toBe('');
  });
});

describe('grpcSecret.usageToDomain', () => {
  it('keeps the id and the name of each pipeline of the page, and the total of every page', () => {
    const usage = grpcSecret.usageToDomain({
      pipelines: [
        {
          pipelineId: { value: 'pipeline-1' },
          projectId: { value: 'project-1' },
          name: 'deploy',
          nodeCount: 2,
          createdAt: TS,
          updatedAt: TS,
        },
      ],
      pagination: {
        totalCount: 12,
        page: 1,
        pageSize: 10,
        totalPages: 2,
        hasNext: true,
        hasPrevious: false,
      },
    });

    expect(usage).toEqual({ pipelines: [{ id: 'pipeline-1', name: 'deploy' }], totalCount: 12 });
  });

  it('counts the page when the server sends no pagination', () => {
    expect(grpcSecret.usageToDomain({ pipelines: [] }).totalCount).toBe(0);
  });
});
