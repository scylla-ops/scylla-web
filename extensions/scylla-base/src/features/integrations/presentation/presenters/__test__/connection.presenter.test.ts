import { describe, it, expect } from 'vitest';
import type { VcsConnectionEntity } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import {
  eventsLabel,
  repairActionOf,
  repositoriesLabel,
  stateReasonText,
  tokenExpiryText,
  unavailableText,
} from '../connection.presenter.ts';

const NOW = Date.parse('2026-11-11T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const connection = (patch: Partial<VcsConnectionEntity> = {}): VcsConnectionEntity => ({
  id: 'c-1',
  workspaceId: 'ws-1',
  provider: 'github',
  account: 'acme',
  accountKind: 'organization',
  avatarUrl: '',
  state: 'active',
  stateReason: '',
  deliveryMode: 'webhook',
  pollIntervalSeconds: 120,
  allRepositories: false,
  repositoryCount: 1,
  projectCount: 0,
  scopes: [],
  missingPermissions: [],
  settingsUrl: 'https://github.com/settings/installations/1',
  createdBy: 'u-1',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...patch,
});

describe('connection presenter', () => {
  it('counts repositories on GitHub and projects on GitLab', () => {
    expect(repositoriesLabel(connection())).toBe('1 repository');
    expect(repositoriesLabel(connection({ allRepositories: true }))).toBe('All repositories');
    expect(repositoriesLabel(connection({ provider: 'gitlab', repositoryCount: 6 }))).toBe(
      '6 projects',
    );
  });

  it('gives the event mode, with the poll interval in minutes', () => {
    expect(eventsLabel(connection())).toBe('Webhooks');
    expect(eventsLabel(connection({ deliveryMode: 'polling', pollIntervalSeconds: 120 }))).toBe(
      'Polling every 2 min',
    );
    expect(eventsLabel(connection({ deliveryMode: 'polling', pollIntervalSeconds: 30 }))).toBe(
      'Polling every minute',
    );
  });

  it('says why a connection stopped, and says nothing for an active one', () => {
    expect(stateReasonText(connection())).toBe('');
    expect(
      stateReasonText(connection({ state: 'disconnected', stateReason: 'APP_UNINSTALLED' })),
    ).toBe('The GitHub App was uninstalled from acme. Reports, triggers and checkouts stopped.');
    expect(
      stateReasonText(connection({ state: 'needs_attention', stateReason: 'A_NEWER_REASON' })),
    ).toBe('GitLab or GitHub refused a call. Look at the connection on the provider.');
  });

  it('tells the expiry of a GitLab token, before and after it', () => {
    expect(tokenExpiryText(connection(), NOW)).toBe('');
    expect(
      tokenExpiryText(connection({ tokenExpiresAt: new Date(NOW + DAY).toISOString() }), NOW),
    ).toMatch(/^The token expires on /);
    expect(
      tokenExpiryText(connection({ tokenExpiresAt: new Date(NOW - DAY).toISOString() }), NOW),
    ).toMatch(/^The token expired on /);
  });

  it('offers the one action that repairs a connection', () => {
    expect(repairActionOf(connection(), NOW)).toBeNull();
    expect(
      repairActionOf(connection({ state: 'disconnected', stateReason: 'APP_UNINSTALLED' }), NOW),
    ).toBe('install_again');
    expect(
      repairActionOf(
        connection({ state: 'needs_attention', stateReason: 'PERMISSIONS_NOT_ACCEPTED' }),
        NOW,
      ),
    ).toBe('configure');
    const gitlab = connection({ provider: 'gitlab' });
    expect(repairActionOf(gitlab, NOW)).toBeNull();
    expect(
      repairActionOf({ ...gitlab, tokenExpiresAt: new Date(NOW + 6 * DAY).toISOString() }, NOW),
    ).toBe('replace_token');
    expect(repairActionOf({ ...gitlab, state: 'needs_attention' }, NOW)).toBe('replace_token');
  });

  it('says why a provider is not available on this server', () => {
    const github = { provider: 'github' as const, webUrl: '', unavailableReason: '' };
    expect(unavailableText(undefined)).toBeNull();
    expect(unavailableText({ ...github, available: true })).toBeNull();
    expect(unavailableText({ ...github, available: false, unavailableReason: 'APP_MISSING' })).toBe(
      'This server has no GitHub App. An admin of the instance must create it.',
    );
    expect(
      unavailableText({ ...github, available: false, unavailableReason: 'SECRET_KEY_MISSING' }),
    ).toBe('The server has no key to encrypt the token.');
  });
});
