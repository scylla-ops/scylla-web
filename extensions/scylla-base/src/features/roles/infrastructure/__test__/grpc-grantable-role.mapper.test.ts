// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcGrantableRole from '../grpc-grantable-role.mapper.ts';
import {
  type GrantableRole,
  RoleKind as GrpcRoleKind,
} from '@base/generated/scylla/authz/v1/grant.ts';
import { ScopeKind } from '@base/generated/scylla/authz/v1/permission.ts';
import { PermissionScope } from '@platform/authz';
import { RoleKind } from '@base/features/roles/domain/entities/role.entity.ts';

const grantable = (overrides: Partial<GrantableRole> = {}): GrantableRole => ({
  roleId: { value: 'organization-admin' },
  scopeKind: ScopeKind.ORGANIZATION,
  kind: GrpcRoleKind.ADMIN,
  description: 'Full control of the organization',
  name: 'Organization admin',
  ...overrides,
});

describe('grpcGrantableRole.toDomain', () => {
  it('unwraps the id, maps scope and kind, carries the name and the description', () => {
    expect(grpcGrantableRole.toDomain(grantable())).toEqual({
      id: 'organization-admin',
      name: 'Organization admin',
      scope: PermissionScope.ORGANIZATION,
      kind: RoleKind.ADMIN,
      description: 'Full control of the organization',
      ownerOrganizationId: undefined,
    });
  });

  it('carries the owning organization of an organization role', () => {
    expect(
      grpcGrantableRole.toDomain(grantable({ ownerOrganizationId: { value: 'org-1' } }))
        .ownerOrganizationId,
    ).toBe('org-1');
  });

  it('defaults to an empty id when the wrapper is absent', () => {
    expect(grpcGrantableRole.toDomain(grantable({ roleId: undefined })).id).toBe('');
  });

  it.each([
    [GrpcRoleKind.ADMIN, RoleKind.ADMIN],
    [GrpcRoleKind.AGENT, RoleKind.AGENT],
    [GrpcRoleKind.MEMBER, RoleKind.MEMBER],
    [GrpcRoleKind.UNSPECIFIED, RoleKind.UNSPECIFIED],
  ])('maps wire RoleKind %i to domain RoleKind %i', (wire, domain) => {
    expect(grpcGrantableRole.toDomain(grantable({ kind: wire })).kind).toBe(domain);
  });
});
