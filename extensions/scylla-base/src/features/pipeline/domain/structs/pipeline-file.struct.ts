import type { PipelineNodeEntity } from '../entities/pipeline-node.entity.ts';
import type { PipelineFileFormat } from './pipeline-file-format.struct.ts';

/** An error or a warning of a pipeline file. A warning keeps the file valid. */
export interface FileError {
  /** Empty for an error of the lookup that is not about one file. */
  path: string;
  /** From 1. 0: the error has no place in the file. */
  line: number;
  column: number;
  /** For example `nodes[2].needs[0]`. Empty for an error of the syntax. */
  field: string;
  message: string;
  warning: boolean;
}

export type PullRequestEvent = 'opened' | 'new_commits' | 'reopened' | 'ready_for_review';

/** The rules of the `on` section of a file. An absent rule: the file has none. */
export interface FileRules {
  push?: { branches: string[]; excludeBranches: string[]; skipCi: boolean };
  pullRequest?: { branches: string[]; events: PullRequestEvent[]; drafts: boolean };
  tag?: { patterns: string[] };
}

/** How the agent gets the code. Absent from a file: the default, on with the last commit only. */
export interface CheckoutSettings {
  enabled: boolean;
  /** 0: the full history. */
  depth: number;
  submodules: boolean;
  lfs: boolean;
}

/** A pipeline file at a commit of the linked repository, as the server read it. */
export interface PipelineFile {
  key: string;
  /** For example `.scylla/pipelines/build.toml`. */
  path: string;
  commitSha: string;
  /** The page of the file at the commit on the provider. Empty when the server has none. */
  url: string;
  /** Absent: an extension that this build does not know. */
  format?: PipelineFileFormat;
  content: string;
  /** The name in the file, else the key. */
  name: string;
  /** Empty when the file has an error. */
  nodes: PipelineNodeEntity[];
  checkout?: CheckoutSettings;
  rules: FileRules;
  errors: FileError[];
}

/** The errors that stop a run: not the warnings. */
export const blockingErrors = (file: Pick<PipelineFile, 'errors'>): FileError[] =>
  file.errors.filter(error => !error.warning);
