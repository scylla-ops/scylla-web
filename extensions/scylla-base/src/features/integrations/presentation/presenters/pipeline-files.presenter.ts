import { t } from '@scylla/ui/i18n';
import {
  blockingIssues,
  type FoundPipelineFile,
  type PipelineFileIssue,
  type PipelineFiles,
} from '@base/features/integrations/domain/structs/pipeline-files.struct.ts';
import { pipelineSourceMessages as messages } from '../messages/pipeline-source.messages.ts';

const SHORT_SHA = 7;

/** "Found on main at a1b2c3d", or the same line with no file. */
export const filesHeading = (files: PipelineFiles, branch: string): string => {
  const sha = files.commitSha.slice(0, SHORT_SHA);
  return files.files.length > 0
    ? t(messages.foundOn(branch, sha))
    : t(messages.noFileOn(branch, sha));
};

/** "line 12: expected "="", or the text alone for an error with no place in the file. */
export const issueText = (issue: PipelineFileIssue): string =>
  issue.line > 0 ? t(messages.errorAt(issue.line, issue.message)) : issue.message;

/** An error of the lookup, with its file when it has one. */
export const lookupIssueText = (issue: PipelineFileIssue): string =>
  issue.path ? `${issue.path}: ${issueText(issue)}` : issueText(issue);

/** A file in the list: valid or the count of its errors, then its triggers or its first error. */
export interface PipelineFileRow {
  path: string;
  url: string;
  valid: boolean;
  badge: string;
  detail: string;
}

export const pipelineFileRow = (file: FoundPipelineFile): PipelineFileRow => {
  const errors = blockingIssues(file.issues);
  const row = { path: file.path, url: file.url };
  if (errors.length > 0) {
    return {
      ...row,
      valid: false,
      badge: t(messages.errors(errors.length)),
      detail: issueText(errors[0]),
    };
  }
  return {
    ...row,
    valid: true,
    badge: t(messages.valid),
    detail:
      file.triggers.length > 0
        ? t(messages.triggers(file.triggers.join(', ')))
        : t(messages.noOnSection),
  };
};

/** `true` when a file or the lookup has an error that stops a run. */
export const hasBlockingIssues = (files: PipelineFiles): boolean =>
  blockingIssues(files.issues).length > 0 ||
  files.files.some(file => blockingIssues(file.issues).length > 0);
