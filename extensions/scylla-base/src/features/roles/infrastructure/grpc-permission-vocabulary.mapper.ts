import type { AuthzAction } from '@base/generated/scylla/authz/v1/permission.ts';
import type {
  PermissionAction,
  PermissionVocabulary,
} from '@base/features/roles/domain/structs/permission-vocabulary.struct.ts';
import * as grpcPermission from '@base/features/roles/infrastructure/grpc-permission.mapper.ts';

export function actionToDomain(grpcAction: AuthzAction): PermissionAction {
  return {
    permission: grpcPermission.toDomain(grpcAction.permission),
    minScope: grpcPermission.scopeToDomain(grpcAction.minScope),
  };
}

export function toDomain(grpcActions: AuthzAction[]): PermissionVocabulary {
  return {
    actions: grpcActions.map(actionToDomain),
  };
}
