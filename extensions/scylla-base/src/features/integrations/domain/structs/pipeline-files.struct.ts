/** An error or a warning of a pipeline file. A warning keeps the file valid. */
export interface PipelineFileIssue {
  /** Empty for an error of the lookup that is not about one file. */
  path: string;
  /** From 1. 0: the error has no place in the file. */
  line: number;
  column: number;
  message: string;
  warning: boolean;
}

/** A section of `on` in a pipeline file, with the name that the file uses. */
export type FileTrigger = 'push' | 'pull_request' | 'tag';

/** A pipeline file at a commit of the linked repository, with no text. */
export interface FoundPipelineFile {
  key: string;
  /** For example `.scylla/pipelines/build.toml`. */
  path: string;
  /** The page of the file at the commit on the provider. Empty when the server has none. */
  url: string;
  issues: PipelineFileIssue[];
  /** Empty: the file has no `on` section, and the pipeline starts only on manual runs. */
  triggers: FileTrigger[];
}

/** The pipeline files of a commit of the linked repository, as the server read them. */
export interface PipelineFiles {
  commitSha: string;
  /** In the order of their keys. */
  files: FoundPipelineFile[];
  /** The errors of the lookup that are not about one file, for example two files for one key. */
  issues: PipelineFileIssue[];
}

/** The errors that stop a run: not the warnings. */
export const blockingIssues = (issues: readonly PipelineFileIssue[]): PipelineFileIssue[] =>
  issues.filter(issue => !issue.warning);
