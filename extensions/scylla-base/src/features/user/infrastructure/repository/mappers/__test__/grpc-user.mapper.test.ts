// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { GrpcUserMapper } from '../grpc-user.mapper';
import type { User, UserAccess } from '@base/generated/scylla/user/v1/user.ts';
import { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';
const LATER = { seconds: 1735776000n, nanos: 0 };
const LATER_ISO = '2025-01-02T00:00:00.000Z';

const baseUser = (overrides: Partial<User> = {}): User => ({
  userId: { value: 'user-1' },
  username: 'ravenne',
  email: { value: 'ravenne@example.com' },
  displayName: 'Ravenne Lee',
  isActive: true,
  createdAt: TS,
  updatedAt: LATER,
  ...overrides,
});

describe('GrpcUserMapper.toDomain', () => {
  it('unwraps the id and the email, and formats both timestamps', () => {
    expect(GrpcUserMapper.toDomain(baseUser())).toEqual({
      userId: 'user-1',
      username: 'ravenne',
      email: 'ravenne@example.com',
      displayName: 'Ravenne Lee',
      isActive: true,
      createdAt: ISO,
      updatedAt: LATER_ISO,
    });
  });

  it('leaves out the email and the display name when the account has none', () => {
    const user = GrpcUserMapper.toDomain(baseUser({ email: undefined, displayName: undefined }));

    expect(user).not.toHaveProperty('email');
    expect(user).not.toHaveProperty('displayName');
  });

  it('carries a deactivated account through', () => {
    expect(GrpcUserMapper.toDomain(baseUser({ isActive: false })).isActive).toBe(false);
  });

  it('defaults to an empty userId when the wrapper is absent', () => {
    expect(GrpcUserMapper.toDomain(baseUser({ userId: undefined })).userId).toBe('');
  });
});

describe('GrpcUserMapper.toDomainList', () => {
  it('maps every user and carries the pagination metadata through', () => {
    const pagination = {
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    };
    const result = GrpcUserMapper.toDomainList({ users: [baseUser()], pagination });
    expect(result.items).toEqual([GrpcUserMapper.toDomain(baseUser())]);
    expect(result.pagination).toBe(pagination);
  });
});

describe('GrpcUserMapper.toCreateRequest', () => {
  it('wraps the email and sends the display name when there is one', () => {
    expect(
      GrpcUserMapper.toCreateRequest({
        email: 'ada@example.com',
        username: 'ada',
        password: 'hunter22',
        displayName: 'Ada',
      }),
    ).toEqual({
      username: 'ada',
      password: 'hunter22',
      email: { value: 'ada@example.com' },
      displayName: 'Ada',
    });
  });

  it('sends no display name for an empty one', () => {
    const request = GrpcUserMapper.toCreateRequest({
      email: 'ada@example.com',
      username: 'ada',
      password: 'hunter22',
      displayName: '',
    });

    expect(request).not.toHaveProperty('displayName');
  });
});

describe('GrpcUserMapper.toUpdateRequest', () => {
  it('sends only the fields that change', () => {
    expect(GrpcUserMapper.toUpdateRequest({ userId: 'user-1', displayName: 'Ada' })).toEqual({
      userId: { value: 'user-1' },
      displayName: 'Ada',
    });
  });

  it('keeps an empty display name, which removes it', () => {
    expect(GrpcUserMapper.toUpdateRequest({ userId: 'user-1', displayName: '' })).toEqual({
      userId: { value: 'user-1' },
      displayName: '',
    });
  });

  it('wraps a new email', () => {
    expect(
      GrpcUserMapper.toUpdateRequest({ userId: 'user-1', username: 'ada', email: 'a@b.co' }),
    ).toEqual({ userId: { value: 'user-1' }, username: 'ada', email: { value: 'a@b.co' } });
  });
});

describe('GrpcUserMapper.accessToDomain', () => {
  const access = (scope: UserAccess['scope'], overrides: Partial<UserAccess> = {}): UserAccess => ({
    grantId: { value: 'grant-1' },
    scope,
    organizationId: { value: 'org-1' },
    organizationName: 'Acme',
    projectName: '',
    roleId: { value: 'organization-admin' },
    roleName: 'Organization admin',
    ...overrides,
  });

  it('maps a grant on an organization', () => {
    expect(
      GrpcUserMapper.accessToDomain(
        access({ scope: { oneofKind: 'organization', organization: {} } }),
      ),
    ).toEqual({
      grantId: 'grant-1',
      scope: 'organization',
      organizationId: 'org-1',
      organizationName: 'Acme',
      projectName: '',
      roleId: 'organization-admin',
      roleName: 'Organization admin',
    });
  });

  it('maps a grant on a project, with the project id', () => {
    const grant = GrpcUserMapper.accessToDomain(
      access(
        { scope: { oneofKind: 'project', project: { projectId: { value: 'project-1' } } } },
        { projectName: 'Web' },
      ),
    );

    expect(grant).toMatchObject({ scope: 'project', projectId: 'project-1', projectName: 'Web' });
  });

  it('maps a system grant, with no organization', () => {
    const grant = GrpcUserMapper.accessToDomain(
      access(
        { scope: { oneofKind: 'system', system: {} } },
        { organizationId: undefined, organizationName: '' },
      ),
    );

    expect(grant.scope).toBe('system');
    expect(grant).not.toHaveProperty('organizationId');
  });
});

describe('GrpcUserMapper.deliveryToDomain', () => {
  it.each([
    [PasswordResetDelivery.MAIL, 'mail'],
    [PasswordResetDelivery.SERVER_LOG, 'server-log'],
    [PasswordResetDelivery.UNSPECIFIED, 'unknown'],
  ] as const)('maps %s to %s', (delivery, expected) => {
    expect(GrpcUserMapper.deliveryToDomain(delivery)).toBe(expected);
  });
});
