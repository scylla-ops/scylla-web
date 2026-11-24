import { describe, it, expect } from 'vitest';
import { EMPTY_OPERATOR, type LegalDocument, type LegalInfo } from '@platform/legal';
import { legalPage } from '../legal-page.presenter.ts';

const document = (title: string, content: LegalDocument['content']): LegalDocument => ({
  kind: 'privacy',
  title,
  content,
  version: '',
  effectiveDate: null,
  acceptanceRequired: false,
  changes: '',
  updatedAt: null,
});

const info = (...documents: LegalDocument[]): LegalInfo => ({
  operator: EMPTY_OPERATOR,
  privacyContact: '',
  documents,
});

describe('legalPage', () => {
  it('heads a page of another site with the title of the kind, in the language of the UI', () => {
    const url = 'https://acme.example/confidentialite';

    expect(
      legalPage(info(document('Politique de confidentialité', { type: 'url', url })), 'privacy'),
    ).toEqual({ state: 'elsewhere', title: 'Privacy policy', url });
  });

  it('heads a text with the title of the operator, and names its kind in the language of the UI', () => {
    const page = legalPage(
      info(document('Politique de confidentialité', { type: 'markdown', markdown: 'Texte' })),
      'privacy',
    );

    expect(page).toMatchObject({
      state: 'page',
      kindTitle: 'Privacy policy',
      title: 'Politique de confidentialité',
    });
  });
});
