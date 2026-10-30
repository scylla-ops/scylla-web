import type { ISecretServiceClient } from '@base/generated/scylla/secret/v1/secret.client.ts';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipeline/v1/pipeline.client.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  CreateSecretInput,
  SecretEntity,
  UpdateSecretInput,
} from '@base/features/secret/domain/entities/secret.entity.ts';
import type { SecretUsage } from '@base/features/secret/domain/structs/secret-usage.struct.ts';
import type { SecretRepository } from '@base/features/secret/domain/repository/secret.repository.ts';
import * as grpcSecret from './grpc-secret.mapper.ts';

const USAGE_PAGE = { page: 1, pageSize: 10 };

export class DefaultSecretRepository implements SecretRepository {
  constructor(
    private readonly client: ISecretServiceClient,
    private readonly pipelineClient: IPipelineServiceClient,
  ) {}

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

  public async update(input: UpdateSecretInput): Promise<SecretEntity> {
    const response = await this.client.updateSecret({
      secretId: wrapId(input.secretId),
      value: input.value,
      description: input.description,
    }).response;
    if (!response.secret) throw new Error('UpdateSecret returned no secret');
    return grpcSecret.toDomain(response.secret);
  }

  public async listPipelinesUsing(projectId: string, secretName: string): Promise<SecretUsage> {
    const response = await this.pipelineClient.listProjectPipelines({
      projectId: wrapId(projectId),
      pagination: USAGE_PAGE,
      secretRef: secretName,
    }).response;
    return grpcSecret.usageToDomain(response);
  }

  public async deleteById(secretId: string): Promise<void> {
    await this.client.deleteSecret({ secretId: wrapId(secretId) }).response;
  }
}
