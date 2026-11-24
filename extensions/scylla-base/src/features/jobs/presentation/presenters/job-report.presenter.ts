import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import { formatTime } from '@shared/utils/date-utils.ts';
import type { JobReports, VcsReport } from '@base/features/integrations';
import { jobGitMessages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';
import { shortSha } from './job-source.presenter.ts';

/** The server stops a report after this many failed calls. */
export const MAX_REPORT_ATTEMPTS = 10;

/** How the delivery of a report goes: the icon of its row and of the jobs list. */
export type ReportTone = 'sent' | 'waiting' | 'sending' | 'retrying' | 'not_sent';

const WORST_FIRST: readonly ReportTone[] = ['not_sent', 'retrying', 'sending', 'waiting', 'sent'];

/** The words of the providers for a state that is not final yet. */
const OPEN_WORDS = new Set(['pending', 'queued']);

const SENT_WORDS: Record<string, MessageDescriptor> = {
  success: jobGitMessages.sentSuccess,
  failure: jobGitMessages.sentFailure,
  failed: jobGitMessages.sentFailure,
  error: jobGitMessages.sentError,
  pending: jobGitMessages.sentPending,
  queued: jobGitMessages.sentPending,
  in_progress: jobGitMessages.sentInProgress,
  running: jobGitMessages.sentInProgress,
  cancelled: jobGitMessages.sentCancelled,
  canceled: jobGitMessages.sentCancelled,
};

const NO_REPORT_REASONS: Record<string, MessageDescriptor> = {
  NO_SOURCE: jobGitMessages.noSource,
  NO_REPOSITORY_LINK: jobGitMessages.noRepositoryLink,
  REPORTS_OFF: jobGitMessages.reportsOff,
  REPOSITORY_NOT_ACTIVE: jobGitMessages.repositoryNotActive,
};

export const toneOf = (report: VcsReport): ReportTone => {
  if (report.state === 'sent') return OPEN_WORDS.has(report.sentState) ? 'waiting' : 'sent';
  return report.state;
};

/** The tone of the report that goes worst. `null` when the job has no report. */
export const worstTone = (reports: readonly VcsReport[]): ReportTone | null => {
  const tones = new Set(reports.map(toneOf));
  return WORST_FIRST.find(tone => tones.has(tone)) ?? null;
};

/** "GitHub check scylla/build", "GitHub status scylla/build", "GitLab status scylla/build". */
export const reportTitle = (report: VcsReport): string => {
  if (report.provider === 'gitlab') return t(jobGitMessages.gitLabStatus(report.context));
  return t(
    report.mode === 'check_run'
      ? jobGitMessages.gitHubCheck(report.context)
      : jobGitMessages.gitHubStatus(report.context),
  );
};

/** The state that the provider got, in the words of this app. A word it does not know stays. */
export const sentStateText = (sentState: string): string => {
  const word = SENT_WORDS[sentState];
  return word ? t(word) : sentState;
};

export interface ReportLine {
  tone: ReportTone;
  /** The delivery state, for example "Success sent at 12:03". */
  text: string;
  /** What the state means, or the last error. */
  detail: string;
}

/** The row of one report. `now` counts down the next attempt of a report that retries. */
export const reportLine = (report: VcsReport, sha: string, now: number): ReportLine => {
  const tone = toneOf(report);
  switch (report.state) {
    case 'sent':
      return {
        tone,
        text: t(jobGitMessages.sentAt(sentStateText(report.sentState), formatTime(report.sentAt))),
        detail: sha
          ? t(
              report.mode === 'check_run' && report.provider === 'github'
                ? jobGitMessages.checkRunOn(shortSha(sha))
                : jobGitMessages.commitStatusOn(shortSha(sha)),
            )
          : '',
      };
    case 'sending':
      return { tone, text: t(jobGitMessages.sending), detail: '' };
    case 'retrying': {
      const nextAt = report.nextAttemptAt ? Date.parse(report.nextAttemptAt) : NaN;
      const seconds = Math.ceil((nextAt - now) / 1000);
      return {
        tone,
        text: t(
          seconds > 0
            ? jobGitMessages.retryIn(seconds, report.attempts, MAX_REPORT_ATTEMPTS)
            : jobGitMessages.retrySoon(report.attempts, MAX_REPORT_ATTEMPTS),
        ),
        detail: report.error,
      };
    }
    case 'not_sent':
      return { tone, text: t(jobGitMessages.notSent), detail: report.error };
  }
};

/** Why a job has no report. A code this build does not know shows as it is. */
export const noReportText = (reports: JobReports): string => {
  const reason = NO_REPORT_REASONS[reports.noReportReason];
  return reason ? t(reason) : reports.noReportReason;
};
