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

  public async listByProjectId(projectId: string): Promise<SecretEntity[]> {
    const response = await this.client.listSecrets({ projectId: wrapId(projectId) }).response;
    return response.secrets.map(grpcSecret.toDomain);
  }

  public async create(input: CreateSecretInput): Promise<SecretEntity> {
    const response = await this.client.createSecret({
      projectId: wrapId(input.projectId),
      name: input.name,
      value: input.value,
      description: input.description,
    }).response;
    // No `secret` in the response: a shape this build cannot read.
    if (!response.secret) throw new Error('CreateSecret returned no secret');
    return grpcSecret.toDomain(response.secret);
  }

  public async deleteById(secretId: string): Promise<void> {
    await this.client.deleteSecret({ secretId: wrapId(secretId) }).response;
  }
}
