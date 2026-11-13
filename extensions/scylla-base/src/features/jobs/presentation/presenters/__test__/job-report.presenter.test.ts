// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { JobReports, VcsReport } from '@base/features/integrations';
import {
  noReportText,
  reportLine,
  reportTitle,
  worstTone,
} from '../job-report.presenter.ts';

const SHA = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
const NOW = Date.parse('2026-11-11T12:00:00.000Z');

const report = (overrides: Partial<VcsReport> = {}): VcsReport => ({
  jobId: 'job-1',
  provider: 'github',
  mode: 'check_run',
  context: 'scylla/build',
  state: 'sent',
  sentState: 'success',
  sentAt: '2026-11-11T12:03:00.000Z',
  attempts: 0,
  error: '',
  externalUrl: 'https://github.com/acme/api/runs/1',
  ...overrides,
});

describe('reportTitle', () => {
  it('names the kind of the report on its provider', () => {
    expect(reportTitle(report())).toBe('GitHub check scylla/build');
    expect(reportTitle(report({ mode: 'commit_status' }))).toBe('GitHub status scylla/build');
    expect(reportTitle(report({ provider: 'gitlab', mode: 'commit_status' }))).toBe(
      'GitLab status scylla/build',
    );
  });
});

describe('reportLine', () => {
  it('tells the state that the provider got, and what it is', () => {
    const line = reportLine(report(), SHA, NOW);

    expect(line.tone).toBe('sent');
    expect(line.text).toMatch(/^Success sent at /);
    expect(line.detail).toBe('Check run on a1b2c3d.');
    expect(reportLine(report({ mode: 'commit_status' }), SHA, NOW).detail).toBe(
      'Commit status on a1b2c3d.',
    );
  });

  it('shows a state that is not final yet as a wait', () => {
    const line = reportLine(report({ sentState: 'queued' }), SHA, NOW);

    expect(line.tone).toBe('waiting');
    expect(line.text).toMatch(/^Pending sent at /);
  });

  it('keeps a word of the provider that this build does not know', () => {
    expect(reportLine(report({ sentState: 'neutral' }), SHA, NOW).text).toMatch(
      /^neutral sent at /,
    );
  });

  it('counts down to the next attempt of a report that retries, with the error', () => {
    const line = reportLine(
      report({
        state: 'retrying',
        attempts: 3,
        nextAttemptAt: '2026-11-11T12:00:30.000Z',
        error: 'GitHub answered 502 Bad Gateway.',
      }),
      SHA,
      NOW,
    );

    expect(line).toEqual({
      tone: 'retrying',
      text: 'Retry in 30 s · attempt 3 of 10',
      detail: 'GitHub answered 502 Bad Gateway.',
    });
  });

  it('says that a report retries soon when its time passed', () => {
    const line = reportLine(
      report({ state: 'retrying', attempts: 4, nextAttemptAt: '2026-11-11T11:59:00.000Z' }),
      SHA,
      NOW,
    );

    expect(line.text).toBe('Retry soon · attempt 4 of 10');
  });

  it('tells why a report was not sent', () => {
    const line = reportLine(
      report({ state: 'not_sent', error: 'The GitHub App was uninstalled from acme.' }),
      SHA,
      NOW,
    );

    expect(line).toEqual({
      tone: 'not_sent',
      text: 'Not sent',
      detail: 'The GitHub App was uninstalled from acme.',
    });
  });

  it('shows a report in flight as sending', () => {
    expect(reportLine(report({ state: 'sending' }), SHA, NOW)).toEqual({
      tone: 'sending',
      text: 'Sending...',
      detail: '',
    });
  });
});

describe('worstTone', () => {
  it('gives the report that goes worst, and nothing with no report', () => {
    expect(worstTone([report(), report({ state: 'retrying' })])).toBe('retrying');
    expect(worstTone([report({ state: 'sending' }), report({ state: 'not_sent' })])).toBe(
      'not_sent',
    );
    expect(worstTone([report({ sentState: 'pending' })])).toBe('waiting');
    expect(worstTone([])).toBeNull();
  });
});

describe('noReportText', () => {
  const reports = (noReportReason: string): JobReports => ({
    jobId: 'job-1',
    reports: [],
    noReportReason,
  });

  it.each([
    ['NO_SOURCE', 'This run has no commit.'],
    ['NO_REPOSITORY_LINK', 'No repository linked.'],
    ['REPORTS_OFF', 'Reports are off.'],
    ['REPOSITORY_NOT_ACTIVE', 'The repository link is not active.'],
    ['SOMETHING_NEW', 'SOMETHING_NEW'],
  ])('tells the reason %s in words', (reason, text) => {
    expect(noReportText(reports(reason))).toBe(text);
  });
});
