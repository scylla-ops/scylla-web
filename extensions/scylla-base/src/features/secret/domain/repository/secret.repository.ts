import type {
  CreateSecretInput,
  SecretEntity,
  UpdateSecretInput,
} from '@base/features/secret/domain/entities/secret.entity.ts';
import type { SecretUsage } from '@base/features/secret/domain/structs/secret-usage.struct.ts';

export interface SecretRepository {
  listByProjectId(projectId: string): Promise<SecretEntity[]>;
  create(input: CreateSecretInput): Promise<SecretEntity>;
  update(input: UpdateSecretInput): Promise<SecretEntity>;
  listPipelinesUsing(projectId: string, secretName: string): Promise<SecretUsage>;
  deleteById(secretId: string): Promise<void>;
}
