// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcRole from '../grpc-role.mapper.ts';
import { ScopeKind } from '@base/generated/scylla/authz/v1/permission.ts';
import type { Role } from '@base/generated/scylla/authz/v1/role.ts';
import { RoleKind as GrpcRoleKind } from '@base/generated/scylla/authz/v1/grant.ts';
import { PermissionScope, RoleKind } from '@platform/authz';
import type {
  RoleEntity,
  RoleCreationData,
} from '@base/features/roles/domain/entities/role.entity.ts';

const baseRole = (overrides: Partial<Role> = {}): Role => ({
  roleId: { value: 'role-1' },
  name: 'CI runner',
  description: 'runs pipelines',
  scopeKind: ScopeKind.PROJECT,
  access: { access: { oneofKind: 'fullControl', fullControl: {} } },
  origin: { oneofKind: 'custom', custom: {} },
  kind: GrpcRoleKind.MEMBER,
  ...overrides,
});

describe('grpcRole.toDomain', () => {
  it('unwraps the id, carries name/description, and maps scope/access', () => {
    const domain = grpcRole.toDomain(baseRole());
    expect(domain.id).toBe('role-1');
    expect(domain.name).toBe('CI runner');
    expect(domain.description).toBe('runs pipelines');
    expect(domain.scope).toBe(PermissionScope.PROJECT);
    expect(domain.access).toEqual({ kind: 'fullControl' });
    expect(domain.kind).toBe(RoleKind.MEMBER);
  });

  it('maps an agent role to the agent kind', () => {
    expect(grpcRole.toDomain(baseRole({ kind: GrpcRoleKind.AGENT })).kind).toBe(RoleKind.AGENT);
  });

  it('defaults to an empty id when the wrapper is absent', () => {
    expect(grpcRole.toDomain(baseRole({ roleId: undefined })).id).toBe('');
  });

  describe('origin', () => {
    it('maps a builtin role, carrying its stable key', () => {
      const domain = grpcRole.toDomain(
        baseRole({ origin: { oneofKind: 'builtin', builtin: { key: 'organization-admin' } } }),
      );
      expect(domain.origin).toEqual({ kind: 'builtin', key: 'organization-admin' });
    });

    it('maps a custom role, carrying its owning organization', () => {
      const domain = grpcRole.toDomain(
        baseRole({
          origin: { oneofKind: 'custom', custom: { ownerOrganizationId: { value: 'org-1' } } },
        }),
      );
      expect(domain.origin).toEqual({ kind: 'custom', ownerOrganizationId: 'org-1' });
    });

    it('a custom role with no owner id is still "custom", with an undefined owner', () => {
      const domain = grpcRole.toDomain(baseRole({ origin: { oneofKind: 'custom', custom: {} } }));
      expect(domain.origin).toEqual({ kind: 'custom', ownerOrganizationId: undefined });
    });

    it('an origin arm this build does not know reads as unknown, never as "custom"', () => {
      const domain = grpcRole.toDomain(baseRole({ origin: { oneofKind: undefined } }));
      expect(domain.origin).toEqual({ kind: 'unknown' });
    });
  });
});

describe('grpcRole.toGrpcCreateRequest', () => {
  const data = (overrides: Partial<RoleCreationData> = {}): RoleCreationData => ({
    name: 'CI runner',
    description: 'runs pipelines',
    scope: PermissionScope.PROJECT,
    kind: RoleKind.AGENT,
    access: { kind: 'fullControl' },
    ...overrides,
  });

  it('builds the wire create request of a platform role from RoleCreationData', () => {
    expect(grpcRole.toGrpcCreateRequest(data())).toEqual({
      name: 'CI runner',
      description: 'runs pipelines',
      scopeKind: ScopeKind.PROJECT,
      access: { access: { oneofKind: 'fullControl', fullControl: {} } },
      kind: GrpcRoleKind.AGENT,
      organizationId: undefined,
    });
  });

  it('names the owning organization of an organization role', () => {
    expect(grpcRole.toGrpcCreateRequest(data({ organizationId: 'org-1' })).organizationId).toEqual({
      value: 'org-1',
    });
  });

  it('sends an unspecified kind as a member role', () => {
    expect(grpcRole.toGrpcCreateRequest(data({ kind: RoleKind.UNSPECIFIED })).kind).toBe(
      GrpcRoleKind.MEMBER,
    );
  });

  it('refuses the admin kind: it belongs to the builtin owner roles', () => {
    expect(() => grpcRole.toGrpcCreateRequest(data({ kind: RoleKind.ADMIN }))).toThrow(
      /reserved for the builtin roles/,
    );
  });
});

describe('grpcRole.toGrpcUpdateRequest', () => {
  const role = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
    id: 'role-1',
    name: 'CI runner',
    description: 'runs pipelines',
    scope: PermissionScope.PROJECT,
    origin: { kind: 'custom' },
    kind: RoleKind.MEMBER,
    access: { kind: 'fullControl' },
    ...overrides,
  });

  it("builds the wire update request (no scope - a role's scope is immutable)", () => {
    expect(grpcRole.toGrpcUpdateRequest(role())).toEqual({
      roleId: { value: 'role-1' },
      name: 'CI runner',
      description: 'runs pipelines',
      access: { access: { oneofKind: 'fullControl', fullControl: {} } },
    });
  });

  it('refuses to update a role whose access this build cannot read - saving it back would drop it', () => {
    expect(() => grpcRole.toGrpcUpdateRequest(role({ access: { kind: 'unknown' } }))).toThrow(
      /cannot be updated here/,
    );
  });
});
