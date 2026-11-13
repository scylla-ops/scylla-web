import { t } from '@scylla/ui/i18n';
import type { GitProvider, JobSource } from '@base/features/jobs/domain/entities/job.entity.ts';
import { jobGitMessages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';

export const shortSha = (sha: string): string => sha.slice(0, 7);

export const providerName = (provider: GitProvider): string =>
  provider === 'gitlab' ? 'GitLab' : 'GitHub';

/** `#128` on GitHub, `!17` on GitLab. */
export const pullRequestLabel = (provider: GitProvider, number: number): string =>
  `${provider === 'gitlab' ? '!' : '#'}${number}`;

export interface SourceRef {
  kind: 'branch' | 'tag';
  /** A branch of a fork has the owner of the fork before it: `octocat:patch-1`. */
  name: string;
}

/** The branch or the tag of the commit. `null` for a run on a SHA. */
export const refOf = (source: JobSource): SourceRef | null => {
  if (source.branch) {
    const owner = source.fromFork ? source.forkRepository.split('/')[0] : '';
    return { kind: 'branch', name: owner ? `${owner}:${source.branch}` : source.branch };
  }
  return source.tag ? { kind: 'tag', name: source.tag } : null;
};

/** What started the job, in words. `null` for an event newer than this build. */
export const eventText = (source: JobSource): string | null => {
  const firstPullRequest = source.pullRequests[0];
  const label = firstPullRequest ? pullRequestLabel(source.provider, firstPullRequest.number) : '';
  const gitlab = source.provider === 'gitlab';
  switch (source.event) {
    case 'push':
      return t(jobGitMessages.eventPush);
    case 'pull_request': {
      const message = source.fromFork
        ? gitlab
          ? jobGitMessages.eventMergeRequestFromFork(label)
          : jobGitMessages.eventPullRequestFromFork(label)
        : gitlab
          ? jobGitMessages.eventMergeRequest(label)
          : jobGitMessages.eventPullRequest(label);
      return t(message).replace(/\s+/g, ' ').trim();
    }
    case 'tag':
      return t(jobGitMessages.eventTag(source.tag));
    case 'manual':
      return t(jobGitMessages.eventManual(source.branch || source.tag || shortSha(source.sha)));
    case 'provider_rerun':
      return t(gitlab ? jobGitMessages.eventRerunOnGitLab : jobGitMessages.eventRerunOnGitHub);
    case 'trigger':
      return t(jobGitMessages.eventTrigger);
    default:
      return null;
  }
};
