import { t } from '@scylla/ui/i18n';
import type { RepositoryLink, VcsProvider } from '@base/features/integrations';
import type {
  GitKind,
  GitSource,
  PullRequestEvent,
  TriggerKind,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';
import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

/** GitLab says "merge request" where GitHub says "pull request". */
const onGitLab = (provider: VcsProvider | undefined): boolean => provider === 'gitlab';

export const gitKindLabel = (kind: GitKind, provider?: VcsProvider): string => {
  switch (kind) {
    case 'push':
      return t(triggersMessages.kindPush);
    case 'pullRequest':
      return onGitLab(provider)
        ? t(triggersMessages.kindMergeRequest)
        : t(triggersMessages.kindPullRequest);
    case 'tag':
      return t(triggersMessages.kindTag);
  }
};

/** The name of a kind, as the type picker and the list show it. */
export const triggerKindLabel = (kind: TriggerKind, provider?: VcsProvider): string => {
  switch (kind) {
    case 'cron':
      return t(triggersMessages.kindSchedule);
    case 'webhook':
      return t(triggersMessages.kindWebhook);
    case 'unknown':
      return t(triggersMessages.unknown);
    default:
      return gitKindLabel(kind, provider);
  }
};

/** The order of the events in the form. */
export const PULL_REQUEST_EVENTS: readonly PullRequestEvent[] = [
  'opened',
  'newCommits',
  'reopened',
  'readyForReview',
];

export const pullRequestEventLabel = (event: PullRequestEvent): string => {
  switch (event) {
    case 'opened':
      return t(triggersMessages.eventOpened);
    case 'newCommits':
      return t(triggersMessages.eventNewCommits);
    case 'reopened':
      return t(triggersMessages.eventReopened);
    case 'readyForReview':
      return t(triggersMessages.eventReadyForReview);
  }
};

const globs = (list: readonly string[], all: string): string =>
  list.length > 0 ? list.join(', ') : all;

/** The rules of a row of the list: "main, release/*", "into main · drafts skipped", "v*". */
export const gitSourceSummary = (source: GitSource): string => {
  switch (source.kind) {
    case 'push':
      return globs(source.branches, t(triggersMessages.anyBranch));
    case 'pullRequest': {
      const into = t(triggersMessages.intoBranches(globs(source.branches, t(triggersMessages.anyBranch))));
      return source.drafts ? into : `${into} · ${t(triggersMessages.draftsSkipped)}`;
    }
    case 'tag':
      return globs(source.patterns, t(triggersMessages.anyTag));
  }
};

/** What starts a run of a Git trigger, with the repository when it is known. */
export const gitKindHint = (kind: GitKind, link?: RepositoryLink | null): string => {
  switch (kind) {
    case 'push':
      return link
        ? t(triggersMessages.pushHintOf(link.fullName))
        : t(triggersMessages.pushHint);
    case 'pullRequest':
      return onGitLab(link?.provider)
        ? t(triggersMessages.mergeRequestHint)
        : t(triggersMessages.pullRequestHint);
    case 'tag':
      return t(triggersMessages.tagHint);
  }
};

export interface GitVariable {
  name: string;
  description: string;
}

/** The variables that each node of a run of a Git trigger gets. */
export const gitVariables = (kind: GitKind, link?: RepositoryLink | null): GitVariable[] => {
  const byKind: GitVariable[] = {
    push: [
      { name: 'SCYLLA_GIT_BRANCH', description: t(triggersMessages.variableBranch) },
      { name: 'SCYLLA_GIT_TAG', description: t(triggersMessages.variableTag) },
    ],
    pullRequest: [
      { name: 'SCYLLA_GIT_BRANCH', description: t(triggersMessages.variableBranch) },
      {
        name: 'SCYLLA_PR_NUMBER',
        description: onGitLab(link?.provider)
          ? t(triggersMessages.variableMergeRequestNumber)
          : t(triggersMessages.variablePullRequestNumber),
      },
    ],
    tag: [{ name: 'SCYLLA_GIT_TAG', description: t(triggersMessages.variableTag) }],
  }[kind];
  return [
    { name: 'SCYLLA_GIT_SHA', description: t(triggersMessages.variableSha) },
    { name: 'SCYLLA_GIT_REF', description: t(triggersMessages.variableRef) },
    ...byKind,
    {
      name: 'SCYLLA_REPO',
      description: link?.fullName || t(triggersMessages.variableRepository),
    },
    {
      name: 'SCYLLA_REPO_URL',
      description: link?.webUrl || t(triggersMessages.variableRepositoryUrl),
    },
    { name: 'SCYLLA_EVENT', description: t(triggersMessages.variableEvent) },
    { name: 'SCYLLA_GIT_FORK', description: t(triggersMessages.variableFork) },
  ];
};

/** The two fixed notes of the Git triggers: the forks, and one run per commit. */
export const gitNotes = (provider?: VcsProvider): { fork: string; oneRun: string } =>
  onGitLab(provider)
    ? {
        fork: t(triggersMessages.forkNoteGitLab),
        oneRun: t(triggersMessages.oneRunNoteGitLab),
      }
    : { fork: t(triggersMessages.forkNote), oneRun: t(triggersMessages.oneRunNote) };
