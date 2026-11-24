import { PipelineSource as GrpcPipelineSource } from '@base/generated/scylla/integrations/v1/vcs.ts';
import type { PipelineFile as GrpcPipelineFile } from '@base/generated/scylla/pipelines/v1/pipeline_file.ts';
import type { ListPipelineFilesResponse } from '@base/generated/scylla/pipelines/v1/pipeline_service.ts';
import type { FileError as GrpcFileError } from '@base/generated/scylla/pipelines/v1/source.ts';
import type { PipelineSource } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import type {
  FileTrigger,
  FoundPipelineFile,
  PipelineFileIssue,
  PipelineFiles,
} from '@base/features/integrations/domain/structs/pipeline-files.struct.ts';

export const sourceToProto = (source: PipelineSource): GrpcPipelineSource =>
  source === 'file' ? GrpcPipelineSource.FILE : GrpcPipelineSource.EDITOR;

const issueToDomain = (error: GrpcFileError): PipelineFileIssue => ({
  path: error.path,
  line: error.line,
  column: error.column,
  message: error.message,
  warning: error.warning,
});

const triggersOf = ({ push, pullRequest, tag }: GrpcPipelineFile): FileTrigger[] => [
  ...(push ? (['push'] as const) : []),
  ...(pullRequest ? (['pull_request'] as const) : []),
  ...(tag ? (['tag'] as const) : []),
];

const fileToDomain = (file: GrpcPipelineFile): FoundPipelineFile => ({
  key: file.key,
  path: file.file?.path ?? '',
  url: file.file?.url ?? '',
  issues: file.errors.map(issueToDomain),
  triggers: triggersOf(file),
});

export const filesToDomain = (response: ListPipelineFilesResponse): PipelineFiles => ({
  commitSha: response.commitSha,
  files: response.files.map(fileToDomain),
  issues: response.errors.map(issueToDomain),
});
