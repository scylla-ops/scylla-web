// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PermissionScope } from '@platform/authz';
import type { AccessEntryEntity } from '@base/features/access';
import {
  buildOrganizationMembers,
  buildProjectMembers,
  MemberRoleOrigin,
} from '../scope-members.presenter.ts';

const entry = (overrides: Partial<AccessEntryEntity> = {}): AccessEntryEntity => ({
  actorId: 'user-1',
  actorKind: 'user',
  displayName: 'Alice',
  handle: 'alice',
  role: 'admin',
  ...overrides,
});

describe('buildOrganizationMembers', () => {
  it('lists a user with a role on the workspace, with that role as a DIRECT one', () => {
    expect(buildOrganizationMembers([entry()])).toEqual([
      {
        userId: 'user-1',
        roles: [
          {
            grantId: `${PermissionScope.ORGANIZATION}:admin`,
            userId: 'user-1',
            roleId: 'admin',
            origin: MemberRoleOrigin.DIRECT,
            scope: PermissionScope.ORGANIZATION,
          },
        ],
      },
    ]);
  });

  it('leaves the apps out: only a person is a member', () => {
    expect(buildOrganizationMembers([entry({ actorKind: 'app', role: 'runner' })])).toEqual([]);
  });

  it('lists a user once, with each role, the strongest first', () => {
    const [member] = buildOrganizationMembers([entry({ role: 'viewer' }), entry({ role: 'admin' })]);

    expect(member.roles.map(role => role.roleId)).toEqual(['admin', 'viewer']);
  });

  it('shows an owner as locked: Revoke does not take it back', () => {
    const [member] = buildOrganizationMembers([entry({ role: 'owner' })]);

    expect(member.roles[0]).toMatchObject({ roleId: 'owner', origin: MemberRoleOrigin.INHERITED });
  });

  it('keeps one role once when the server lists it twice', () => {
    const [member] = buildOrganizationMembers([entry(), entry()]);

    expect(member.roles).toHaveLength(1);
  });
});

describe('buildProjectMembers', () => {
  it('gives the roles of the project as DIRECT, and the workspace roles as locked', () => {
    const [member] = buildProjectMembers(
      [entry({ role: 'editor' })],
      [entry({ role: 'member' })],
    );

    expect(member.roles).toEqual([
      expect.objectContaining({
        roleId: 'editor',
        origin: MemberRoleOrigin.DIRECT,
        scope: PermissionScope.PROJECT,
      }),
      expect.objectContaining({
        roleId: 'member',
        origin: MemberRoleOrigin.INHERITED,
        scope: PermissionScope.ORGANIZATION,
      }),
    ]);
  });

  it('keeps a project admin and a workspace admin apart', () => {
    const [member] = buildProjectMembers([entry()], [entry()]);

    expect(member.roles.map(role => role.grantId)).toEqual([
      `${PermissionScope.PROJECT}:admin`,
      `${PermissionScope.ORGANIZATION}:admin`,
    ]);
  });

  it('lists a person of the workspace with no role of the project', () => {
    const members = buildProjectMembers([], [entry({ actorId: 'user-2', role: 'viewer' })]);

    expect(members.map(member => member.userId)).toEqual(['user-2']);
    expect(members[0].roles[0].origin).toBe(MemberRoleOrigin.INHERITED);
  });
});
