// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { toDomain } from '../grpc-workspace.mapper.ts';

describe('grpcWorkspace.toDomain', () => {
  it('unwraps the id and keeps the name and the slug', () => {
    expect(toDomain({ id: { value: 'ws-1' }, name: 'Acme', slug: 'acme' })).toEqual({
      id: 'ws-1',
      name: 'Acme',
      slug: 'acme',
    });
  });

  it('gives an empty id when the wrapper is absent', () => {
    expect(toDomain({ name: 'Acme', slug: 'acme' }).id).toBe('');
  });
});
