import { describe, it, expect } from 'vitest';
import { messages } from '@base/features/notifications/locales/fr/messages.ts';
import { withLocale } from '@test/i18n.ts';
import { t } from '@scylla/ui/i18n';
import { notificationMessages } from '../../messages/notifications.messages.ts';
import { bellLabel } from '../bell.presenter.ts';
import { viewOfRow } from '../kind-views.ts';
import { row } from './fixtures.ts';

withLocale('fr', messages);

describe('the notifications in French', () => {
  it('keeps each name of the invitation sentence', () => {
    const view = viewOfRow(
      row({
        kind: 'invitation.received',
        actorName: 'Sam',
        workspaceName: 'Acme',
        params: { role: 'custom' },
      }),
      null,
    );

    expect(view.text).toBe('Sam vous a invité dans Acme en tant que Custom.');
  });

  it('gives the bell a plural form', () => {
    expect(bellLabel(1)).toBe('Notifications, 1 non lue');
    expect(bellLabel(4)).toBe('Notifications, 4 non lues');
  });

  it('gives the two arms of a count', () => {
    expect(t(notificationMessages.occurrences(1))).toBe('1 fois');
    expect(t(notificationMessages.occurrences(3))).toBe('3 fois');
  });
});
