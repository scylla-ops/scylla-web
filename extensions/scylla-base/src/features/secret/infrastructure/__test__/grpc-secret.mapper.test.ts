// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { Pipeline } from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import { toDomain, usageToDomain } from '../grpc-secret.mapper.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';

const pipeline = (id: string, secret?: string): Pipeline => ({
  id: { value: id },
  name: `pipeline ${id}`,
  version: 1n,
  nodes: [
    {
      id: 'build',
      needs: [],
      step: { oneofKind: 'exec', exec: { argv: ['make'] } },
      env: [
        { name: 'MODE', value: { oneofKind: 'literal', literal: 'release' } },
        ...(secret ? [{ name: 'TOKEN', value: { oneofKind: 'secret' as const, secret } }] : []),
      ],
      timeoutSeconds: 0,
      retries: 0,
      workingDir: '',
    },
  ],
});

describe('grpcSecret.toDomain', () => {
  it('unwraps the ids and formats the times', () => {
    expect(
      toDomain({
        id: { value: 'secret-1' },
        projectId: { value: 'project-1' },
        name: 'DATABASE_URL',
        createdAt: TS,
        updatedAt: TS,
      }),
    ).toEqual({
      id: 'secret-1',
      projectId: 'project-1',
      name: 'DATABASE_URL',
      createdAt: ISO,
      updatedAt: ISO,
    });
  });
});

describe('grpcSecret.usageToDomain', () => {
  it('keeps the pipelines with a variable that names the secret', () => {
    const usage = usageToDomain(
      [pipeline('a', 'DATABASE_URL'), pipeline('b'), pipeline('c', 'OTHER')],
      'DATABASE_URL',
    );

    expect(usage).toEqual({ pipelines: [{ id: 'a', name: 'pipeline a' }], totalCount: 1 });
  });

  it('lists ten names at most, and counts them all', () => {
    const many = Array.from({ length: 12 }, (_, index) => pipeline(`p${index}`, 'TOKEN'));

    const usage = usageToDomain(many, 'TOKEN');

    expect(usage.pipelines).toHaveLength(10);
    expect(usage.totalCount).toBe(12);
  });
});
