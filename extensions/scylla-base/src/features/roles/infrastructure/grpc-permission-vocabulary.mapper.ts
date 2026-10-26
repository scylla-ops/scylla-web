import type { AuthzAction } from '@base/generated/scylla/authz/v1/permission.ts';
import type {
  PermissionAction,
  PermissionVocabulary,
} from '@base/features/roles/domain/structs/permission-vocabulary.struct.ts';
import { GrpcPermissionMapper } from '@base/features/roles/infrastructure/grpc-permission.mapper.ts';

export class GrpcPermissionVocabularyMapper {
  public static actionToDomain(grpcAction: AuthzAction): PermissionAction {
    return {
      permission: GrpcPermissionMapper.toDomain(grpcAction.permission),
      minScope: GrpcPermissionMapper.scopeToDomain(grpcAction.minScope),
    };
  }

  public static toDomain(grpcActions: AuthzAction[]): PermissionVocabulary {
    return {
      actions: grpcActions.map(GrpcPermissionVocabularyMapper.actionToDomain),
    };
  }
}
