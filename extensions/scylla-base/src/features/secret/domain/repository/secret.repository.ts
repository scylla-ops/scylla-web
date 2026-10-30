import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type {
  CreateSecretInput,
  SecretEntity,
  UpdateSecretInput,
} from '@base/features/secret/domain/entities/secret.entity.ts';
import type { SecretUsage } from '@base/features/secret/domain/structs/secret-usage.struct.ts';

export interface SecretRepository {
  listByProjectId(projectId: string): Promise<ScyllaResult<SecretEntity[]>>;
  create(input: CreateSecretInput): Promise<ScyllaResult<SecretEntity>>;
  update(input: UpdateSecretInput): Promise<ScyllaResult<SecretEntity>>;
  listPipelinesUsing(projectId: string, secretName: string): Promise<ScyllaResult<SecretUsage>>;
  deleteById(secretId: string): Promise<ScyllaResult<void>>;
}
