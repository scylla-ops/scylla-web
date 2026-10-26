import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { ISecretServiceClient } from '@base/generated/scylla/secret/v1/secret.client.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  CreateSecretInput,
  SecretEntity,
} from '@base/features/secret/domain/entities/secret.entity.ts';
import type { SecretRepository } from '@base/features/secret/domain/repository/secret.repository.ts';
import * as grpcSecret from './grpc-secret.mapper.ts';

export class DefaultSecretRepository implements SecretRepository {
  constructor(private readonly client: ISecretServiceClient) {}

  public listByProjectId(projectId: string): Promise<ScyllaResult<SecretEntity[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listSecrets({ projectId: wrapId(projectId) }).response;
      return response.secrets.map(grpcSecret.toDomain);
    }, 'Error listing secrets');
  }

  public create(input: CreateSecretInput): Promise<ScyllaResult<SecretEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.createSecret({
        projectId: wrapId(input.projectId),
        name: input.name,
        value: input.value,
        description: input.description,
      }).response;
      // No `secret` in the response: a shape this build cannot read.
      if (!response.secret) throw new Error('CreateSecret returned no secret');
      return grpcSecret.toDomain(response.secret);
    }, 'Failed to create secret.');
  }

  public deleteById(secretId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.deleteSecret({ secretId: wrapId(secretId) }).response;
    }, 'Error deleting secret');
  }
}
