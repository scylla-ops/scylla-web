import { describe, it, expect } from 'vitest';
import { badgeText, bellLabel } from '../bell.presenter.ts';
import { coreKinds, viewOfRow } from '../kind-views.ts';
import { pageKey } from '../page-keys.ts';
import { sectionsOf } from '../sections.ts';
import { row } from './fixtures.ts';

describe('the kinds of the core', () => {
  // The list of `the_edition_has_the_kinds_of_the_catalog` in the tests of the server.
  it('has a view for each kind of the server', () => {
    expect([...coreKinds()].sort()).toEqual([
      'admin.granted',
      'admin.revoked',
      'instance_role.changed',
      'invitation.accepted',
      'invitation.declined',
      'invitation.received',
      'owner.added',
      'owner.removed',
      'role.granted',
      'role.revoked',
      'security.account_locked',
      'security.email_changed',
      'security.identity_linked',
      'security.identity_unlinked',
      'security.password_changed',
      'security.session_reuse',
      'token.created',
      'vcs.connection_broken',
      'vcs.token_expiring',
    ]);
  });
});

describe('the notices of the Git connections', () => {
  it('tells the provider, the account and the cause of a broken connection, with the page of the connections', () => {
    const view = viewOfRow(
      row({
        kind: 'vcs.connection_broken',
        category: 'integrations',
        reason: 'owner',
        workspaceSlug: 'acme',
        params: { provider: 'github', account: 'octo', reason: 'APP_UNINSTALLED' },
      }),
      null,
    );

    expect(view.text).toBe('The GitHub connection octo needs attention.');
    expect(view.detail).toBe(
      'The GitHub App was uninstalled. Reports, triggers and checkouts stopped.',
    );
    expect(view.reason).toBe('You own this workspace.');
    expect(view.href).toBe('/acme/settings/integrations');
  });

  it('gives a general detail for an unknown cause', () => {
    const view = viewOfRow(
      row({
        kind: 'vcs.connection_broken',
        params: { provider: 'gitlab', account: 'scylla-bot', reason: 'SOMETHING_NEW' },
      }),
      null,
    );

    expect(view.text).toBe('The GitLab connection scylla-bot needs attention.');
    expect(view.detail).toBe('Reports, triggers and checkouts stopped.');
    expect(view.href).toBeNull();
  });

  it('tells the day of the expiry of a GitLab token, for an admin of the workspace', () => {
    const view = viewOfRow(
      row({
        kind: 'vcs.token_expiring',
        reason: 'workspace_admin',
        workspaceSlug: 'acme',
        params: { provider: 'gitlab', account: 'scylla-bot', expires_at: '2026-11-20' },
      }),
      null,
    );

    expect(view.text).toBe('The GitLab token of scylla-bot expires on 2026-11-20.');
    expect(view.detail).toBe('Replace the token before this date.');
    expect(view.reason).toBe('You are an admin of this workspace.');
    expect(view.href).toBe('/acme/settings/integrations');
  });
});

describe('viewOfRow', () => {
  it('shows a generic line and no link for a kind with no view', () => {
    const view = viewOfRow(row({ kind: 'build.failed' }), 'acme');

    expect(view.text).toBe('You have a new notification.');
    expect(view.href).toBeNull();
    expect(view.detail).toBeNull();
  });

  it('says Someone for a row with no actor', () => {
    const view = viewOfRow(
      row({ kind: 'invitation.accepted', workspaceName: 'Acme', reason: 'inviter' }),
      null,
    );

    expect(view.text).toBe('Someone accepted your invitation to Acme.');
  });

  it('shows what a change of roles added and removed, with the names of the roles', () => {
    const view = viewOfRow(
      row({
        kind: 'role.granted',
        actorName: 'Sam',
        workspaceName: 'Acme',
        workspaceSlug: 'acme',
        params: { added: '["member","QA team"]', removed: '["viewer"]' },
      }),
      null,
    );

    expect(view.text).toBe('Sam changed your roles in Acme.');
    expect(view.detail).toBe('Added: Member, QA team. Removed: Viewer.');
    expect(view.href).toBe('/acme/dashboard');
  });

  it('gives a role.revoked the same view, and no link when the person only lost a role', () => {
    const view = viewOfRow(
      row({
        kind: 'role.revoked',
        projectName: 'Billing',
        workspaceSlug: 'acme',
        params: { removed: '["viewer"]' },
      }),
      null,
    );

    expect(view.text).toBe('Your roles in Billing changed.');
    expect(view.href).toBeNull();
  });

  it('does not fail on a parameter that is not a list', () => {
    const view = viewOfRow(row({ kind: 'role.granted', params: { added: '{not json' } }), null);

    expect(view.detail).toBeNull();
  });

  it('tells the person and the other owners a different sentence', () => {
    const fields = { kind: 'owner.added', actorName: 'Sam', workspaceName: 'Acme' };

    expect(viewOfRow(row(fields), null).text).toBe('You are now an owner of Acme.');
    const other = viewOfRow(row({ ...fields, reason: 'owner' }), null);
    expect(other.text).toBe('Sam added an owner to Acme.');
    expect(other.reason).toBe('You own this workspace.');
  });

  it.each(['invitation.accepted', 'invitation.declined'])(
    'links %s to the members of the workspace of the row',
    kind => {
      const view = viewOfRow(row({ kind, workspaceSlug: 'acme' }), 'other');

      expect(view.href).toBe('/acme/access/members');
    },
  );

  it('links a security kind in the frame of the workspace, or outside a workspace', () => {
    expect(viewOfRow(row(), 'acme').href).toBe('/acme/account/security');
    expect(viewOfRow(row(), null).href).toBe('/account/security');
  });

  it('shows the name of a token and links its page', () => {
    const view = viewOfRow(row({ kind: 'token.created', params: { name: 'ci' } }), null);

    expect(view.text).toBe('New API token: ci.');
    expect(view.href).toBe('/account/tokens');
  });
});

describe('sectionsOf', () => {
  const now = new Date(2026, 10, 6, 15, 0);
  const at = (day: number) => new Date(2026, 10, day, 9, 0).toISOString();

  it('puts the rows in sections, in a fixed order, with no empty section', () => {
    const sections = sectionsOf(
      [
        row({ id: 'action', needsAction: true, lastAt: at(1) }),
        row({ id: 'today', lastAt: at(6) }),
        row({ id: 'week', lastAt: at(2) }),
        row({ id: 'old', lastAt: new Date(2026, 9, 1, 9, 0).toISOString() }),
      ],
      now,
    );

    expect(sections.map(section => section.id)).toEqual([
      'needs-action',
      'today',
      'week',
      'earlier',
    ]);
    expect(sections[0]?.rows[0]?.id).toBe('action');
    expect(sectionsOf([row({ lastAt: at(6) })], now).map(section => section.id)).toEqual(['today']);
  });
});

describe('the bell', () => {
  it('shows no badge at 0, and stops at 99+', () => {
    expect(badgeText(0)).toBe('');
    expect(badgeText(4)).toBe('4');
    expect(badgeText(100)).toBe('99+');
  });

  it('says the count in its label', () => {
    expect(bellLabel(0)).toBe('Notifications');
    expect(bellLabel(4)).toBe('Notifications, 4 unread');
  });
});

describe('pageKey', () => {
  const press = (key: string, target: EventTarget | null = document.body, init = {}) => {
    const event = new KeyboardEvent('keydown', { key, ...init });
    Object.defineProperty(event, 'target', { value: target });
    return pageKey(event);
  };

  it('maps the keys of the page', () => {
    expect(press('j')).toBe('next');
    expect(press('k')).toBe('previous');
    expect(press('Enter')).toBe('open');
    expect(press('u')).toBe('read');
    expect(press('e')).toBe('done');
    expect(press('x')).toBe('select');
    expect(press('q')).toBeNull();
  });

  it('does nothing in a text field, with a modifier, or for Enter on a button', () => {
    expect(press('j', document.createElement('input'))).toBeNull();
    expect(press('j', document.body, { ctrlKey: true })).toBeNull();
    expect(press('Enter', document.createElement('button'))).toBeNull();
  });
});
