import type { SetPipelineSourceInput } from '../entities/repository-link.entity.ts';
import type { PipelineFiles } from '../structs/pipeline-files.struct.ts';

export interface PipelineSourceRepository {
  /** The pipeline files at the head of the default branch of the linked repository. */
  listFiles(projectId: string): Promise<PipelineFiles>;
  setSource(input: SetPipelineSourceInput): Promise<void>;
}
