import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type {
  CreateSecretInput,
  SecretEntity,
  UpdateSecretInput,
} from '@base/features/secret/domain/entities/secret.entity.ts';
import type { SecretUsage } from '@base/features/secret/domain/structs/secret-usage.struct.ts';
import type { SecretRepository } from '@base/features/secret/domain/repository/secret.repository.ts';
import type { SecretRemoteDataSource } from '@base/features/secret/infrastructure/repository/data-sources/secret-remote.data-source.ts';

export class DefaultSecretRepository implements SecretRepository {
  constructor(private readonly remoteDataSource: SecretRemoteDataSource) {}

  public listByProjectId(projectId: string): Promise<ScyllaResult<SecretEntity[]>> {
    return this.remoteDataSource.listByProjectId(projectId);
  }

  public create(input: CreateSecretInput): Promise<ScyllaResult<SecretEntity>> {
    return this.remoteDataSource.create(input);
  }

  public update(input: UpdateSecretInput): Promise<ScyllaResult<SecretEntity>> {
    return this.remoteDataSource.update(input);
  }

  public listPipelinesUsing(
    projectId: string,
    secretName: string,
  ): Promise<ScyllaResult<SecretUsage>> {
    return this.remoteDataSource.listPipelinesUsing(projectId, secretName);
  }

  public deleteById(secretId: string): Promise<ScyllaResult<void>> {
    return this.remoteDataSource.deleteById(secretId);
  }
}
