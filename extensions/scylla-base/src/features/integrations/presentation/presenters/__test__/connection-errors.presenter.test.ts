import { describe, it, expect } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import {
  daysUntil,
  gitLabErrorText,
  gitLabWarningTexts,
  installErrorText,
} from '../connection-errors.presenter.ts';

const NOW = Date.parse('2026-11-11T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const refusal = (reason: string, message = 'refused') =>
  new ScyllaError(message, { code: 'FAILED_PRECONDITION', reason, raw: true });

describe('connection errors presenter', () => {
  it('gives the words of the flow to the refusals of the GitHub install', () => {
    expect(installErrorText(refusal('STATE_EXPIRED'))).toBe('The link expired. Start again.');
    expect(installErrorText(refusal('INSTALL_PENDING_APPROVAL'))).toBe(
      'An organization owner must approve the request on GitHub.',
    );
    expect(installErrorText(refusal('SOMETHING_NEW', 'The server text'))).toBe('The server text');
  });

  it('gives the words of the dialog to the refusals of a GitLab token', () => {
    expect(gitLabErrorText(refusal('TOKEN_INVALID'))).toBe('GitLab refused this token.');
    expect(gitLabErrorText(refusal('CONNECTION_EXISTS'))).toBe(
      'This account already has a connection in this workspace. Replace its token.',
    );
    expect(gitLabErrorText(refusal('ACCOUNT_CHANGED'))).toBe(
      'This token is for another account. Give a token of the same account.',
    );
  });

  it('counts the days to the expiry in the warning, and drops a warning it does not know', () => {
    const expiry = new Date(NOW + 6 * DAY - 1000).toISOString();

    expect(daysUntil(expiry, NOW)).toBe(6);
    expect(daysUntil(new Date(NOW - DAY).toISOString(), NOW)).toBe(0);
    expect(gitLabWarningTexts(['TOKEN_EXPIRES_SOON', 'NEW_CODE'], expiry, NOW)).toEqual([
      'The token expires in 6 days.',
    ]);
  });
});
