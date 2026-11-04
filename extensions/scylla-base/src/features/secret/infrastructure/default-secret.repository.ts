import type { ISecretServiceClient } from '@base/generated/scylla/projects/v1/secret_service.client.ts';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import type { Secret } from '@base/generated/scylla/projects/v1/secret.ts';
import type { Pipeline } from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import { required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  CreateSecretInput,
  SecretEntity,
  UpdateSecretInput,
} from '@base/features/secret/domain/entities/secret.entity.ts';
import type { SecretUsage } from '@base/features/secret/domain/structs/secret-usage.struct.ts';
import type { SecretRepository } from '@base/features/secret/domain/repository/secret.repository.ts';
import * as grpcSecret from './grpc-secret.mapper.ts';

const PAGE_SIZE = 100;

/** Reads each page of a list. */
const allPages = async <T>(
  read: (token: string) => Promise<{ items: T[]; next: string }>,
): Promise<T[]> => {
  const items: T[] = [];
  let token = '';
  do {
    const page = await read(token);
    items.push(...page.items);
    token = page.next;
  } while (token);
  return items;
};

export class DefaultSecretRepository implements SecretRepository {
  constructor(
    private readonly client: ISecretServiceClient,
    private readonly pipelineClient: IPipelineServiceClient,
  ) {}

  public async listByProjectId(projectId: string): Promise<SecretEntity[]> {
    const secrets = await allPages<Secret>(async token => {
      const response = await this.client.listSecrets({
        projectId: wrapId(projectId),
        page: { size: PAGE_SIZE, token },
      }).response;
      return { items: response.secrets, next: response.page?.nextToken ?? '' };
    });
    return secrets.map(grpcSecret.toDomain);
  }

  public async create(input: CreateSecretInput): Promise<SecretEntity> {
    const response = await this.client.createSecret({
      projectId: wrapId(input.projectId),
      name: input.name,
      value: input.value,
    }).response;
    return grpcSecret.toDomain(required(response.secret, 'secret'));
  }

  public async update(input: UpdateSecretInput): Promise<SecretEntity> {
    const response = await this.client.updateSecret({
      secretId: wrapId(input.secretId),
      value: input.value,
    }).response;
    return grpcSecret.toDomain(required(response.secret, 'secret'));
  }

  /** The server has no filter: the pipelines of the project are read, and their nodes searched. */
  public async listPipelinesUsing(projectId: string, secretName: string): Promise<SecretUsage> {
    const pipelines = await allPages<Pipeline>(async token => {
      const response = await this.pipelineClient.listProjectPipelines({
        projectId: wrapId(projectId),
        page: { size: PAGE_SIZE, token },
      }).response;
      return { items: response.pipelines, next: response.page?.nextToken ?? '' };
    });
    return grpcSecret.usageToDomain(pipelines, secretName);
  }

  public async deleteById(secretId: string): Promise<void> {
    await this.client.deleteSecret({ secretId: wrapId(secretId) }).response;
  }
}
