import { describe, it, expect } from 'vitest';
import { withLocale } from '@test/i18n.ts';
import { messages } from '../../../locales/fr/messages.ts';
import { legalLinks } from '../legal-links.presenter.ts';
import { document, info } from './fixtures.ts';

withLocale('fr', messages);

describe('legalLinks in French', () => {
  it('names each link in French, also when the operator wrote its titles in English', () => {
    const english = info(
      document('privacy', 'Acme privacy notice'),
      document('terms', 'Acme terms'),
      document('dpa', 'Acme DPA'),
    );

    expect(legalLinks(english).map(link => link.label)).toEqual([
      'Politique de confidentialité',
      "Conditions générales d'utilisation",
      'Accord de traitement des données',
    ]);
  });
});
