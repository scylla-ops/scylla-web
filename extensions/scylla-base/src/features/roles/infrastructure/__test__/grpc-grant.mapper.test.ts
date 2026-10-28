// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcGrant from '../grpc-grant.mapper.ts';
import type { Grant } from '@base/generated/scylla/authz/v1/grant.ts';
import { PermissionScope, PrincipalKind } from '@platform/authz';
import type { CreateGrantInput } from '@base/features/roles/domain/entities/grant.entity.ts';

describe('grpcGrant.toDomain', () => {
  const grant = (overrides: Partial<Grant> = {}): Grant => ({
    grantId: { value: 'grant-1' },
    principal: { principal: { oneofKind: 'user', user: { userId: { value: 'user-1' } } } },
    scope: { scope: { oneofKind: 'project', project: { projectId: { value: 'project-1' } } } },
    role: { value: 'role-1' },
    ...overrides,
  });

  it('unwraps ids, flattens the principal and scope refs', () => {
    expect(grpcGrant.toDomain(grant())).toEqual({
      id: 'grant-1',
      principal: { kind: PrincipalKind.USER, id: 'user-1' },
      roleId: 'role-1',
      scope: PermissionScope.PROJECT,
      scopeId: 'project-1',
    });
  });

  it('an app-principal grant maps its principal kind accordingly', () => {
    const domain = grpcGrant.toDomain(
      grant({ principal: { principal: { oneofKind: 'app', app: { appId: { value: 'app-1' } } } } }),
    );
    expect(domain.principal).toEqual({ kind: PrincipalKind.APP, id: 'app-1' });
  });

  it('defaults to empty strings when the id wrappers are absent (never crashes)', () => {
    const domain = grpcGrant.toDomain(grant({ grantId: undefined, role: undefined }));
    expect(domain.id).toBe('');
    expect(domain.roleId).toBe('');
  });
});

describe('grpcGrant.toGrpcCreateRequest', () => {
  it('builds the wire request from a domain CreateGrantInput', () => {
    const input: CreateGrantInput = {
      principal: { kind: PrincipalKind.USER, id: 'user-1' },
      roleId: 'role-1',
      scope: PermissionScope.PROJECT,
      scopeId: 'project-1',
    };

    expect(grpcGrant.toGrpcCreateRequest(input)).toEqual({
      principal: { principal: { oneofKind: 'user', user: { userId: { value: 'user-1' } } } },
      scope: { scope: { oneofKind: 'project', project: { projectId: { value: 'project-1' } } } },
      role: { value: 'role-1' },
    });
  });

  it("propagates the principal-mapper's refusal of an UNSPECIFIED principal", () => {
    const input: CreateGrantInput = {
      principal: { kind: PrincipalKind.UNSPECIFIED, id: '' },
      roleId: 'role-1',
      scope: PermissionScope.PROJECT,
      scopeId: 'project-1',
    };
    expect(() => grpcGrant.toGrpcCreateRequest(input)).toThrow(/principal must be chosen/);
  });

  it("propagates the scope-mapper's refusal of an UNSPECIFIED scope", () => {
    const input: CreateGrantInput = {
      principal: { kind: PrincipalKind.USER, id: 'user-1' },
      roleId: 'role-1',
      scope: PermissionScope.UNSPECIFIED,
      scopeId: '',
    };
    expect(() => grpcGrant.toGrpcCreateRequest(input)).toThrow(/scope must be chosen/);
  });
});
