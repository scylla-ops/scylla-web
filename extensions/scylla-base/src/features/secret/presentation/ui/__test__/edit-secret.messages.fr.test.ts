// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { i18n } from '@lingui/core';
import { withLocale } from '@test/i18n.ts';
import { messages } from '@base/features/secret/locales/fr/messages.ts';
import { editSecretMessages } from '@base/features/secret/presentation/messages/edit-secret.messages.ts';

withLocale('fr', messages);

describe('edit secret messages in French', () => {
  it('agrees the count of the other pipelines', () => {
    expect(i18n._(editSecretMessages.andMore(1))).toBe('et 1 autre');
    expect(i18n._(editSecretMessages.andMore(4))).toBe('et 4 autres');
  });

  it('keeps the name of the secret in the warning title', () => {
    expect(i18n._(editSecretMessages.replaceTitle('API_TOKEN'))).toBe(
      'Remplacer la valeur de API_TOKEN ?',
    );
  });
});
