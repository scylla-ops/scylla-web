// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcUser from '../grpc-user.mapper.ts';
import type { Session, User } from '@base/generated/scylla/accounts/v1/user.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';
const LATER = { seconds: 1735776000n, nanos: 0 };
const LATER_ISO = '2025-01-02T00:00:00.000Z';

const baseUser = (overrides: Partial<User> = {}): User => ({
  id: { value: 'user-1' },
  handle: 'ravenne',
  email: 'ravenne@example.com',
  displayName: 'Ravenne Lee',
  status: 'active',
  instanceAdmin: false,
  createdAt: TS,
  ...overrides,
});

describe('grpcUser.toDomain', () => {
  it('reads the options of a photo that the server drew as a glyph avatar', () => {
    const user = grpcUser.toDomain(
      baseUser({
        avatar: {
          imageId: { value: 'img-1' },
          color: '',
          glyphAvatar: {
            shape: 'scylla',
            glyph: { colors: ['#5d9972'], fill: 0, angle: 0 },
            background: { colors: ['#ffffff'], fill: 0, angle: 0 },
            flip: 0,
            rotate: 0,
            scale: 100,
          },
        },
      }),
    );

    expect(user.avatarUrl).toBe('/images/img-1');
    expect(user.glyphAvatar).toEqual({
      shape: 'scylla',
      glyph: { colors: ['#5d9972'], fill: 'solid', angle: 0 },
      background: { colors: ['#ffffff'], fill: 'solid', angle: 0 },
      flip: 'none',
      rotate: 0,
      scale: 100,
    });
  });

  it('unwraps the id, takes the handle as the username, and formats the time', () => {
    expect(grpcUser.toDomain(baseUser())).toEqual({
      id: 'user-1',
      username: 'ravenne',
      email: 'ravenne@example.com',
      displayName: 'Ravenne Lee',
      isActive: true,
      instanceAdmin: false,
      createdAt: ISO,
      updatedAt: ISO,
    });
  });

  it('leaves out the email and the display name when the account has none', () => {
    const user = grpcUser.toDomain(baseUser({ email: '', displayName: '' }));

    expect(user).not.toHaveProperty('email');
    expect(user).not.toHaveProperty('displayName');
  });

  it('gives the URL of the photo and the color of the initials', () => {
    const user = grpcUser.toDomain(
      baseUser({ avatar: { imageId: { value: 'img-1' }, color: 'chart-4' } }),
    );

    expect(user.avatarUrl).toBe('/images/img-1');
    expect(user.avatarColor).toBe('chart-4');
  });

  it('leaves out the avatar that the user did not choose', () => {
    const user = grpcUser.toDomain(baseUser({ avatar: { color: '' } }));

    expect(user).not.toHaveProperty('avatarUrl');
    expect(user).not.toHaveProperty('avatarColor');
  });

  it('is active only for the status active', () => {
    expect(grpcUser.toDomain(baseUser({ status: 'disabled' })).isActive).toBe(false);
    expect(grpcUser.toDomain(baseUser({ status: 'pending' })).isActive).toBe(false);
  });

  it('defaults to an empty id when the wrapper is absent', () => {
    expect(grpcUser.toDomain(baseUser({ id: undefined })).id).toBe('');
  });
});

describe('grpcUser.toDomainList', () => {
  it('puts every user on one page', () => {
    const entry = (user: ReturnType<typeof baseUser>) => ({
      user,
      instanceRoles: [{ key: 'auditor', name: 'Auditor', builtin: false }],
      workspaces: ['acme'],
      workspaceDetails: [
        {
          workspaceId: { value: 'ws-1' },
          name: 'acme',
          icon: {
            kind: { oneofKind: 'glyph' as const, glyph: { name: 'rocket', color: 'chart-3' } },
          },
          owner: false,
          ownerName: 'Grace Hopper',
        },
      ],
    });
    const result = grpcUser.toDomainList([
      entry(baseUser()),
      entry(baseUser({ id: { value: 'user-2' } })),
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.instanceRoles?.[0]?.name).toBe('Auditor');
    expect(result.items[0]?.workspaces).toEqual(['acme']);
    expect(result.items[0]?.workspaceDetails).toEqual([
      {
        id: 'ws-1',
        name: 'acme',
        icon: { kind: 'glyph', name: 'rocket', color: 'chart-3' },
        owner: false,
        ownerName: 'Grace Hopper',
      },
    ]);
    expect(result.pagination).toMatchObject({ totalCount: 2, page: 1, totalPages: 1 });
  });
});

describe('grpcUser.toCreateRequest', () => {
  it('sends the username as the handle', () => {
    expect(
      grpcUser.toCreateRequest({
        email: 'ada@example.com',
        username: 'ada',
        password: 'hunter22',
        displayName: 'Ada',
      }),
    ).toEqual({
      email: 'ada@example.com',
      handle: 'ada',
      password: 'hunter22',
      displayName: 'Ada',
    });
  });

  it('falls back on the handle for the required display name', () => {
    expect(
      grpcUser.toCreateRequest({ email: 'ada@example.com', username: 'ada', password: 'x' })
        .displayName,
    ).toBe('ada');
  });
});

describe('grpcUser.toUpdateRequest', () => {
  it('sends only the fields that change', () => {
    expect(grpcUser.toUpdateRequest({ id: 'user-1', displayName: 'Ada' })).toEqual({
      userId: { value: 'user-1' },
      displayName: 'Ada',
    });
  });

  it('sends a new handle and a new email as they are', () => {
    expect(
      grpcUser.toUpdateRequest({ id: 'user-1', username: 'ada', email: 'ada@example.com' }),
    ).toEqual({ userId: { value: 'user-1' }, handle: 'ada', email: 'ada@example.com' });
  });
});

describe('grpcUser.sessionToDomain', () => {
  const session = (overrides: Partial<Session> = {}): Session => ({
    id: { value: 'session-1' },
    methods: ['password'],
    userAgent: 'curl/8.7.1',
    ipAddress: '203.0.113.7',
    createdAt: TS,
    lastUsedAt: LATER,
    current: true,
    ...overrides,
  });

  it('maps the session and its last use', () => {
    expect(grpcUser.sessionToDomain(session())).toEqual({
      id: 'session-1',
      createdAt: ISO,
      lastActiveAt: LATER_ISO,
      methods: ['password'],
      userAgent: 'curl/8.7.1',
      ipAddress: '203.0.113.7',
      current: true,
    });
  });

  it('takes the creation time for a session never used since', () => {
    expect(grpcUser.sessionToDomain(session({ lastUsedAt: undefined })).lastActiveAt).toBe(ISO);
  });
});
