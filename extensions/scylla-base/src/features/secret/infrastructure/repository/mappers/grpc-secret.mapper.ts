import type { Secret as ProtoSecret } from '@base/generated/scylla/secret/v1/secret.ts';
import type { ListProjectPipelinesResponse } from '@base/generated/scylla/pipeline/v1/pipeline.ts';
import type { SecretEntity } from '@base/features/secret/domain/entities/secret.entity.ts';
import type { SecretUsage } from '@base/features/secret/domain/structs/secret-usage.struct.ts';
import { idValue, timestampToIso } from '@shared/infrastructure/grpc/wrappers.ts';

export class GrpcSecretMapper {
  static toDomain(s: ProtoSecret): SecretEntity {
    return {
      id: idValue(s.secretId),
      projectId: idValue(s.projectId),
      name: s.name,
      description: s.description,
      createdAt: timestampToIso(s.createdAt),
      updatedAt: timestampToIso(s.updatedAt),
    };
  }

  static usageToDomain(response: ListProjectPipelinesResponse): SecretUsage {
    const pipelines = response.pipelines.map(pipeline => ({
      id: idValue(pipeline.pipelineId),
      name: pipeline.name,
    }));
    return { pipelines, totalCount: response.pagination?.totalCount ?? pipelines.length };
  }
}
