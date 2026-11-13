import type { PipelineFileError } from '@base/features/jobs/domain/entities/job.entity.ts';

/** `path:line:column`, as a compiler writes it. Empty for an error with no file. */
export const fileErrorPlace = (error: PipelineFileError): string => {
  if (!error.path) return '';
  if (error.line === 0) return error.path;
  return error.column === 0
    ? `${error.path}:${error.line}`
    : `${error.path}:${error.line}:${error.column}`;
};
