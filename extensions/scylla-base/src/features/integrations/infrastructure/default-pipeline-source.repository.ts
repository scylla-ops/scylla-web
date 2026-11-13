import type { IPipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import type { SetPipelineSourceInput } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import type { PipelineSourceRepository } from '@base/features/integrations/domain/repository/pipeline-source.repository.ts';
import type { PipelineFiles } from '@base/features/integrations/domain/structs/pipeline-files.struct.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcPipelineFile from './grpc-pipeline-file.mapper.ts';

export class DefaultPipelineSourceRepository implements PipelineSourceRepository {
  constructor(private readonly client: IPipelineServiceClient) {}

  public async listFiles(projectId: string): Promise<PipelineFiles> {
    const response = await this.client.listPipelineFiles({ projectId: wrapId(projectId) }).response;
    return grpcPipelineFile.filesToDomain(response);
  }

  public async setSource(input: SetPipelineSourceInput): Promise<void> {
    await this.client.setPipelineSource({
      projectId: wrapId(input.projectId),
      source: grpcPipelineFile.sourceToProto(input.source),
    }).response;
  }
}
