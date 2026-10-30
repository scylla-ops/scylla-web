// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcPermission from '../grpc-permission.mapper.ts';
import {
  type Access,
  Permission as ProtoPermission,
  type PrincipalRef,
  type ScopeRef,
} from '@base/generated/scylla/authz/v1/permission.ts';
import { RoleKind as ProtoRoleKind } from '@base/generated/scylla/authz/v1/grant.ts';
import { Permission, PermissionScope, PrincipalKind } from '@platform/authz';
import { RoleKind } from '@base/features/roles/domain/entities/role.entity.ts';

describe('grpcPermission.toDomain / toGrpc (Permission)', () => {
  it('is a value-identical pass-through in both directions', () => {
    expect(grpcPermission.toDomain(ProtoPermission.READ_PROJECT)).toBe(Permission.READ_PROJECT);
    expect(grpcPermission.toGrpc(Permission.READ_PROJECT)).toBe(ProtoPermission.READ_PROJECT);
  });

  it('carries UPDATE_SECRET both ways', () => {
    expect(grpcPermission.toDomain(ProtoPermission.UPDATE_SECRET)).toBe(Permission.UPDATE_SECRET);
    expect(grpcPermission.toGrpc(Permission.UPDATE_SECRET)).toBe(ProtoPermission.UPDATE_SECRET);
  });

  it('carries MANAGE_ORG_ROLES both ways', () => {
    expect(grpcPermission.toDomain(ProtoPermission.MANAGE_ORG_ROLES)).toBe(
      Permission.MANAGE_ORG_ROLES,
    );
    expect(grpcPermission.toGrpc(Permission.MANAGE_ORG_ROLES)).toBe(
      ProtoPermission.MANAGE_ORG_ROLES,
    );
  });
});

describe('grpcPermission.roleKindToDomain / roleKindToGrpc', () => {
  it.each([
    [ProtoRoleKind.ADMIN, RoleKind.ADMIN],
    [ProtoRoleKind.AGENT, RoleKind.AGENT],
    [ProtoRoleKind.MEMBER, RoleKind.MEMBER],
    [ProtoRoleKind.UNSPECIFIED, RoleKind.UNSPECIFIED],
  ])('maps wire RoleKind %i to domain RoleKind %i and back', (wire, domain) => {
    expect(grpcPermission.roleKindToDomain(wire)).toBe(domain);
    expect(grpcPermission.roleKindToGrpc(domain)).toBe(wire);
  });
});

describe('grpcPermission.scopeRefToDomain', () => {
  it('an absent ref reads as UNSPECIFIED', () => {
    expect(grpcPermission.scopeRefToDomain(undefined)).toEqual({
      scope: PermissionScope.UNSPECIFIED,
      scopeId: '',
    });
  });

  it('system has no id', () => {
    const ref: ScopeRef = { scope: { oneofKind: 'system', system: {} } };
    expect(grpcPermission.scopeRefToDomain(ref)).toEqual({
      scope: PermissionScope.SYSTEM,
      scopeId: '',
    });
  });

  it('organization carries its organizationId', () => {
    const ref: ScopeRef = {
      scope: { oneofKind: 'organization', organization: { organizationId: { value: 'org-1' } } },
    };
    expect(grpcPermission.scopeRefToDomain(ref)).toEqual({
      scope: PermissionScope.ORGANIZATION,
      scopeId: 'org-1',
    });
  });

  it('an organization ref with no id defaults to an empty scopeId, not a crash', () => {
    const ref: ScopeRef = { scope: { oneofKind: 'organization', organization: {} } };
    expect(grpcPermission.scopeRefToDomain(ref).scopeId).toBe('');
  });

  it('project carries its projectId', () => {
    const ref: ScopeRef = {
      scope: { oneofKind: 'project', project: { projectId: { value: 'project-1' } } },
    };
    expect(grpcPermission.scopeRefToDomain(ref)).toEqual({
      scope: PermissionScope.PROJECT,
      scopeId: 'project-1',
    });
  });

  it('a scope oneof arm this build does not know reads as UNSPECIFIED rather than SYSTEM', () => {
    const ref: ScopeRef = { scope: { oneofKind: undefined } };
    expect(grpcPermission.scopeRefToDomain(ref)).toEqual({
      scope: PermissionScope.UNSPECIFIED,
      scopeId: '',
    });
  });
});

describe('grpcPermission.scopeRefToGrpc', () => {
  it('builds a system ref', () => {
    expect(grpcPermission.scopeRefToGrpc(PermissionScope.SYSTEM, '')).toEqual({
      scope: { oneofKind: 'system', system: {} },
    });
  });

  it('builds an organization ref', () => {
    expect(grpcPermission.scopeRefToGrpc(PermissionScope.ORGANIZATION, 'org-1')).toEqual({
      scope: { oneofKind: 'organization', organization: { organizationId: { value: 'org-1' } } },
    });
  });

  it('builds a project ref', () => {
    expect(grpcPermission.scopeRefToGrpc(PermissionScope.PROJECT, 'project-1')).toEqual({
      scope: { oneofKind: 'project', project: { projectId: { value: 'project-1' } } },
    });
  });

  it('refuses to send an UNSPECIFIED scope - the backend rejects it anyway', () => {
    expect(() => grpcPermission.scopeRefToGrpc(PermissionScope.UNSPECIFIED, '')).toThrow(
      /scope must be chosen/,
    );
  });
});

describe('grpcPermission.principalRefToDomain', () => {
  it('an absent ref reads as UNSPECIFIED', () => {
    expect(grpcPermission.principalRefToDomain(undefined)).toEqual({
      kind: PrincipalKind.UNSPECIFIED,
      id: '',
    });
  });

  it('maps a user principal', () => {
    const ref: PrincipalRef = {
      principal: { oneofKind: 'user', user: { userId: { value: 'user-1' } } },
    };
    expect(grpcPermission.principalRefToDomain(ref)).toEqual({
      kind: PrincipalKind.USER,
      id: 'user-1',
    });
  });

  it('maps an app principal', () => {
    const ref: PrincipalRef = {
      principal: { oneofKind: 'app', app: { appId: { value: 'app-1' } } },
    };
    expect(grpcPermission.principalRefToDomain(ref)).toEqual({
      kind: PrincipalKind.APP,
      id: 'app-1',
    });
  });

  it('a principal oneof arm this build does not know reads as UNSPECIFIED', () => {
    const ref: PrincipalRef = { principal: { oneofKind: undefined } };
    expect(grpcPermission.principalRefToDomain(ref)).toEqual({
      kind: PrincipalKind.UNSPECIFIED,
      id: '',
    });
  });
});

describe('grpcPermission.principalRefToGrpc', () => {
  it('builds a user ref', () => {
    expect(grpcPermission.principalRefToGrpc({ kind: PrincipalKind.USER, id: 'user-1' })).toEqual({
      principal: { oneofKind: 'user', user: { userId: { value: 'user-1' } } },
    });
  });

  it('builds an app ref', () => {
    expect(grpcPermission.principalRefToGrpc({ kind: PrincipalKind.APP, id: 'app-1' })).toEqual({
      principal: { oneofKind: 'app', app: { appId: { value: 'app-1' } } },
    });
  });

  it('refuses to send an UNSPECIFIED principal', () => {
    expect(() =>
      grpcPermission.principalRefToGrpc({ kind: PrincipalKind.UNSPECIFIED, id: '' }),
    ).toThrow(/principal must be chosen/);
  });
});

describe('grpcPermission.accessToDomain', () => {
  it('an absent access reads as unknown, never as an empty permission set', () => {
    expect(grpcPermission.accessToDomain(undefined)).toEqual({ kind: 'unknown' });
  });

  it('maps fullControl', () => {
    const access: Access = { access: { oneofKind: 'fullControl', fullControl: {} } };
    expect(grpcPermission.accessToDomain(access)).toEqual({ kind: 'fullControl' });
  });

  it('maps a restricted permission set', () => {
    const access: Access = {
      access: {
        oneofKind: 'restricted',
        restricted: { permissions: [ProtoPermission.READ_PROJECT, ProtoPermission.UPDATE_PROJECT] },
      },
    };
    expect(grpcPermission.accessToDomain(access)).toEqual({
      kind: 'restricted',
      permissions: [Permission.READ_PROJECT, Permission.UPDATE_PROJECT],
    });
  });

  it('an access oneof arm this build does not know reads as unknown', () => {
    const access: Access = { access: { oneofKind: undefined } };
    expect(grpcPermission.accessToDomain(access)).toEqual({ kind: 'unknown' });
  });
});

describe('grpcPermission.accessToGrpc', () => {
  it('builds a fullControl access', () => {
    expect(grpcPermission.accessToGrpc({ kind: 'fullControl' })).toEqual({
      access: { oneofKind: 'fullControl', fullControl: {} },
    });
  });

  it('builds a restricted access from an explicit permission list', () => {
    expect(
      grpcPermission.accessToGrpc({
        kind: 'restricted',
        permissions: [Permission.READ_PROJECT],
      }),
    ).toEqual({
      access: {
        oneofKind: 'restricted',
        restricted: { permissions: [ProtoPermission.READ_PROJECT] },
      },
    });
  });
});
