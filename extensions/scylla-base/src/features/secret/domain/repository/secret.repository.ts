import type {
  CreateSecretInput,
  SecretEntity,
} from '@base/features/secret/domain/entities/secret.entity.ts';

export interface SecretRepository {
  listByProjectId(projectId: string): Promise<SecretEntity[]>;
  create(input: CreateSecretInput): Promise<SecretEntity>;
  deleteById(secretId: string): Promise<void>;
}
