// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { toDomain, withDetails } from '../grpc-workspace.mapper.ts';

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

describe('grpcWorkspace.withDetails', () => {
  const workspace = (id: string) => ({
    id: { value: id },
    name: 'Personal',
    slug: `personal-${id}`,
    personalTokensEnabled: true,
    timeZone: 'UTC',
    createdAt: { seconds: 1_790_000_000n, nanos: 0 },
  });

  it('joins each workspace to its details by id, with the owner as a user identity', () => {
    const [first, second] = withDetails(
      [workspace('ws-1'), workspace('ws-2')],
      [
        {
          workspaceId: { value: 'ws-2' },
          memberCount: 1,
          projectCount: 0,
          role: 'owner',
        },
        {
          workspaceId: { value: 'ws-1' },
          owner: {
            userId: { value: 'user-1' },
            displayName: 'Alice Martin',
            handle: 'alice',
            email: 'alice@example.test',
            avatar: { color: 'chart-2' },
          },
          memberCount: 3,
          projectCount: 7,
          lastActivityAt: { seconds: 1_790_000_600n, nanos: 0 },
          role: '',
        },
      ],
    );

    expect(first).toMatchObject({
      id: 'ws-1',
      createdAt: new Date(1_790_000_000_000),
      owner: {
        id: 'user-1',
        username: 'alice',
        displayName: 'Alice Martin',
        email: 'alice@example.test',
        avatarColor: 'chart-2',
      },
      memberCount: 3,
      projectCount: 7,
      lastActivityAt: new Date(1_790_000_600_000),
      role: '',
    });
    expect(second).toMatchObject({ id: 'ws-2', memberCount: 1, role: 'owner' });
    expect(second.owner).toBeUndefined();
  });

  it('keeps a workspace with no details as it is', () => {
    expect(withDetails([workspace('ws-1')], [])[0]).not.toHaveProperty('memberCount');
  });
});
