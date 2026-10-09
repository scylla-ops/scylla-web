import type { AuthzAction } from '@base/generated/scylla/authz/v1/permission.ts';
import type {
  PermissionActionEntity,
  PermissionVocabularyEntity,
} from '@base/features/roles/domain/entities/permission-vocabulary.entity.ts';
import { GrpcPermissionMapper } from '@base/features/roles/infrastructure/repository/mappers/grpc-permission.mapper.ts';

export class GrpcPermissionVocabularyMapper {
  public static actionToDomain(grpcAction: AuthzAction): PermissionActionEntity {
    return {
      permission: GrpcPermissionMapper.toDomain(grpcAction.permission),
      minScope: GrpcPermissionMapper.scopeToDomain(grpcAction.minScope),
    };
  }

  public static toDomain(grpcActions: AuthzAction[]): PermissionVocabularyEntity {
    return {
      actions: grpcActions.map(GrpcPermissionVocabularyMapper.actionToDomain),
    };
  }
}
