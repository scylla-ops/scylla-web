// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { toDomain } from '../grpc-workspace.mapper.ts';

describe('grpcWorkspace.toDomain', () => {
  it('unwraps the id and keeps the other fields', () => {
    expect(
      toDomain({
        id: { value: 'ws-1' },
        name: 'Acme',
        slug: 'acme',
        personalTokensEnabled: true,
        timeZone: 'Europe/Paris',
      }),
    ).toEqual({
      id: 'ws-1',
      name: 'Acme',
      slug: 'acme',
      personalTokensEnabled: true,
      timeZone: 'Europe/Paris',
    });
  });

  it('gives an empty id when the wrapper is absent', () => {
    expect(
      toDomain({ name: 'Acme', slug: 'acme', personalTokensEnabled: true, timeZone: 'UTC' }).id,
    ).toBe('');
  });

  it('maps the icon of the workspace, and none for a workspace with the default icon', () => {
    const base = { name: 'Acme', slug: 'acme', personalTokensEnabled: true, timeZone: 'UTC' };

    expect(
      toDomain({
        ...base,
        icon: { kind: { oneofKind: 'glyph', glyph: { name: 'rocket', color: 'chart-2' } } },
      }).icon,
    ).toEqual({ kind: 'glyph', name: 'rocket', color: 'chart-2' });
    expect(toDomain(base)).not.toHaveProperty('icon');
  });
});
