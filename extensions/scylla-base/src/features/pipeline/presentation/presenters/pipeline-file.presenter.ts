import { t } from '@scylla/ui/i18n';
import type {
  CheckoutSettings,
  FileError,
  FileRules,
} from '@base/features/pipeline/domain/structs/pipeline-file.struct.ts';
import type { PipelineOrigin } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { fileMessages } from '../messages/file.messages.ts';

/** The first 7 characters, as the providers show a commit. */
export const shortSha = (sha: string): string => sha.slice(0, 7);

/** `.scylla/pipelines/build.toml` → `build.toml`. */
export const fileName = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

/** The brand names are not translated. */
export const providerName = (provider: string): string =>
  provider === 'gitlab' ? 'GitLab' : 'GitHub';

export type RuleKind = 'push' | 'pull_request' | 'tag';

export interface RuleRow {
  kind: RuleKind;
  title: string;
  detail: string;
}

const list = (globs: readonly string[]) => globs.join(', ');

/** One row for each rule of `on`, in the order of the file format. */
export const ruleRows = ({ push, pullRequest, tag }: FileRules): RuleRow[] => [
  ...(push
    ? [
        {
          kind: 'push' as const,
          title: t(fileMessages.push),
          detail: [
            push.branches.length ? list(push.branches) : t(fileMessages.eachBranch),
            ...(push.excludeBranches.length
              ? [t(fileMessages.except(list(push.excludeBranches)))]
              : []),
            ...(push.skipCi ? [t(fileMessages.skipCi)] : []),
          ].join(' · '),
        },
      ]
    : []),
  ...(pullRequest
    ? [
        {
          kind: 'pull_request' as const,
          title: t(fileMessages.pullRequest),
          detail: [
            t(
              fileMessages.into(
                pullRequest.branches.length
                  ? list(pullRequest.branches)
                  : t(fileMessages.eachBranch),
              ),
            ),
            t(pullRequest.drafts ? fileMessages.draftsIncluded : fileMessages.draftsSkipped),
          ].join(' · '),
        },
      ]
    : []),
  ...(tag
    ? [
        {
          kind: 'tag' as const,
          title: t(fileMessages.tag),
          detail: tag.patterns.length ? list(tag.patterns) : t(fileMessages.eachTag),
        },
      ]
    : []),
];

/** No settings in the file: the default of the server, on with the last commit only. */
export const checkoutRow = (checkout: CheckoutSettings | undefined): Omit<RuleRow, 'kind'> => {
  const settings = checkout ?? { enabled: true, depth: 1, submodules: false, lfs: false };
  if (!settings.enabled) {
    return { title: t(fileMessages.checkoutOff), detail: t(fileMessages.checkoutOffDetail) };
  }
  return {
    title: t(fileMessages.checkoutBuiltIn),
    detail: [
      settings.depth
        ? t(fileMessages.checkoutDepth(settings.depth))
        : t(fileMessages.checkoutFullHistory),
      ...(settings.submodules ? [t(fileMessages.submodules)] : []),
      ...(settings.lfs ? [t(fileMessages.lfs)] : []),
    ].join(' · '),
  };
};

/** Where an error is: its line and column, else the file. */
export const errorPlace = ({ line, column }: Pick<FileError, 'line' | 'column'>): string => {
  if (!line) return t(fileMessages.file);
  return column ? t(fileMessages.lineColumn(line, column)) : t(fileMessages.line(line));
};

/** The text of an error: the path of the value first, when it has one. */
export const errorText = ({ field, message }: Pick<FileError, 'field' | 'message'>): string =>
  field ? `${field}: ${message}` : message;

export interface OriginNote {
  tone: 'error' | 'muted';
  text: string;
}

/** What a row of the pipeline list says about the file of a pipeline, or `null`. */
export const originNote = (origin: PipelineOrigin, defaultBranch?: string): OriginNote | null => {
  const branch = branchLabel(defaultBranch ?? '');
  if (origin.source === 'file') {
    if (origin.removedAt) return { tone: 'muted', text: t(fileMessages.removedFrom(branch)) };
    if (origin.fileErrorCount > 0) {
      const file = fileName(origin.filePath);
      return {
        tone: 'error',
        text: t(fileMessages.errorsOnBranch(file, origin.fileErrorCount, branch)),
      };
    }
    return null;
  }
  return origin.archivedAt ? { tone: 'muted', text: t(fileMessages.archived) } : null;
};

export interface FileNoticeInput {
  path: string;
  /** The branch, the tag or the short SHA that the page shows. */
  branch: string;
  commitSha: string;
  errorCount: number;
  /** No file came: none on the branch, or the server failed. */
  unreadable: boolean;
  notFound: boolean;
}

/** The branch in words while it is not known: the link loads, or the user may not read it. */
export const branchLabel = (branch: string): string => branch || t(fileMessages.defaultBranch);

/** What the notice over the canvas of a file pipeline says. */
export const fileNotice = (input: FileNoticeInput): OriginNote => {
  const branch = branchLabel(input.branch);
  if (input.notFound) return { tone: 'error', text: t(fileMessages.missingOn(branch)) };
  if (input.unreadable) return { tone: 'error', text: t(fileMessages.readFailed) };
  const sha = shortSha(input.commitSha);
  if (input.errorCount > 0) {
    return {
      tone: 'error',
      text: t(fileMessages.invalidOn(fileName(input.path), input.errorCount, branch, sha)),
    };
  }
  return { tone: 'muted', text: t(fileMessages.comesFrom(input.path, branch, sha)) };
};
