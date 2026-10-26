import type {
  App as ProtoApp,
  AppAccess as ProtoAppAccess,
  AppSecret as ProtoAppSecret,
  CreateAppRequest,
  SetAppSecretLabelRequest,
} from '@base/generated/scylla/app/v1/app.ts';
import type {
  AppEntity,
  AppSecretEntity,
  AppAccess,
} from '@base/features/apps/domain/entities/app.entity.ts';
import { idValue, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

export function toDomain(a: ProtoApp): AppEntity {
  return {
    id: idValue(a.appId),
    organizationId: idValue(a.organizationId),
    name: a.name,
    isActive: a.isActive,
    createdAt: timestampToIso(a.createdAt),
    updatedAt: timestampToIso(a.updatedAt),
  };
}

export function secretToDomain(s: ProtoAppSecret): AppSecretEntity {
  return {
    id: idValue(s.appSecretId),
    appId: idValue(s.appId),
    label: s.label,
    enabled: s.enabled,
    createdAt: timestampToIso(s.createdAt),
    updatedAt: timestampToIso(s.updatedAt),
  };
}

/** No `secretLabel`: CE names the first secret with the app name. */
export function toCreateAppRequest(organizationId: string, name: string): CreateAppRequest {
  return { organizationId: wrapId(organizationId), name };
}

export function toSetSecretLabelRequest(secretId: string, label: string): SetAppSecretLabelRequest {
  return { appSecretId: wrapId(secretId), label };
}

/** `null` for a scope arm newer than this build. */
export function accessToDomain(a: ProtoAppAccess): AppAccess | null {
  const scope = a.scope?.scope;
  if (!scope?.oneofKind) return null;

  const scopeId =
    scope.oneofKind === 'organization'
      ? idValue(scope.organization.organizationId)
      : scope.oneofKind === 'project'
        ? idValue(scope.project.projectId)
        : '';

  return {
    grantId: idValue(a.grantId),
    scope: scope.oneofKind,
    scopeId,
    organizationId: a.organizationId ? idValue(a.organizationId) : null,
    organizationName: a.organizationName,
    projectName: a.projectName,
    roleId: idValue(a.roleId),
    roleName: a.roleName,
  };
}
