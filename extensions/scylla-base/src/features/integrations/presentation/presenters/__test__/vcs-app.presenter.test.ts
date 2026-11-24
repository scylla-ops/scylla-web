import { describe, it, expect } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { VcsAppEntity } from '@base/features/integrations/domain/entities/vcs-app.entity.ts';
import { gitHubOrganizationIssue } from '@base/features/integrations/domain/structs/github-organization.struct.ts';
import {
  appSubtitle,
  deliveryPassed,
  deliveryText,
  manifestErrorText,
  organizationIssueText,
} from '../vcs-app.presenter.ts';

const app = (patch: Partial<VcsAppEntity> = {}): VcsAppEntity => ({
  id: 'app-1',
  provider: 'github',
  appId: '77',
  slug: 'scylla-acme',
  name: 'Scylla acme',
  owner: 'acme',
  webUrl: 'https://github.com/apps/scylla-acme',
  webhookUrl: 'https://ci.acme.dev/integrations/github/app-1/webhook',
  lastDeliveryStatus: 0,
  managedBySettings: false,
  ...patch,
});

const refusal = (reason: string) =>
  new ScyllaError('refused', { code: 'FAILED_PRECONDITION', reason, raw: true });

describe('vcs-app presenter', () => {
  it('names the page, the id and the owner of the App', () => {
    expect(appSubtitle(app())).toBe('github.com/apps/scylla-acme · App ID 77 · owner acme');
    expect(appSubtitle(app({ owner: '' }))).toBe('github.com/apps/scylla-acme · App ID 77');
  });

  it('tells the last webhook, or that none came', () => {
    const recent = new Date(Date.now() - 120_000).toISOString();

    expect(deliveryText(app())).toBe('No webhook yet');
    expect(deliveryText(app({ lastDeliveryAt: recent, lastDeliveryStatus: 202 }))).toMatch(
      /^202 · 2 min/,
    );
    expect(deliveryPassed(app({ lastDeliveryStatus: 202 }))).toBe(true);
    expect(deliveryPassed(app({ lastDeliveryStatus: 401 }))).toBe(false);
  });

  it.each([
    ['STATE_EXPIRED', 'The link expired. Create the App again.'],
    ['APP_EXISTS', 'This server has a GitHub App. Remove it first.'],
    [
      'SECRET_KEY_MISSING',
      'The server has no key for the secrets. Set SCYLLA_SECRET_KEY, then try again.',
    ],
    ['APP_MANAGED_BY_SETTINGS', 'The GitHub App comes from the settings of the server.'],
    ['PROVIDER_UNAVAILABLE', 'GitHub did not answer. Try again.'],
  ])('says what the refusal %s means', (reason, text) => {
    expect(manifestErrorText(refusal(reason))).toBe(text);
  });

  it('checks the login of an organization', () => {
    expect(gitHubOrganizationIssue(' acme-labs ')).toBeNull();
    expect(gitHubOrganizationIssue('')).toBe('required');
    expect(gitHubOrganizationIssue('-acme')).toBe('invalid');
    expect(gitHubOrganizationIssue('acme/labs')).toBe('invalid');
    expect(gitHubOrganizationIssue('a'.repeat(40))).toBe('invalid');
    expect(organizationIssueText('required')).toBe('Type the login of the organization.');
    expect(organizationIssueText(null)).toBe('');
  });
});
