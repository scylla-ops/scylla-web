import { describe, it, expect } from 'vitest';
import { legalDocumentTitle, legalLinks } from '../legal-links.presenter.ts';
import { document, info } from './fixtures.ts';

// The operator writes each title in one language: here, in French.
const french = info(
  document('legal-notice', 'Mentions légales'),
  document('privacy', 'Politique de confidentialité'),
  document('subprocessors', 'Liste des sous-traitants', {
    type: 'url',
    url: 'https://acme.example/sous-traitants',
  }),
);

describe('legalLinks', () => {
  it('names each link with the title of its kind, in the language of the UI', () => {
    expect(legalLinks(french)).toEqual([
      { kind: 'legal-notice', label: 'Legal notice', href: '/legal/legal-notice', external: false },
      { kind: 'privacy', label: 'Privacy policy', href: '/legal/privacy', external: false },
      {
        kind: 'subprocessors',
        label: 'Sub-processors',
        href: 'https://acme.example/sous-traitants',
        external: true,
      },
    ]);
  });

  it('gives the short label of the kind for a row of links', () => {
    expect(legalLinks(french, ['privacy', 'terms'], true).map(link => link.label)).toEqual([
      'Privacy',
    ]);
  });
});

describe('legalDocumentTitle', () => {
  it('gives the title of the operator, which heads its text', () => {
    expect(legalDocumentTitle(document('privacy', 'Politique de confidentialité'))).toBe(
      'Politique de confidentialité',
    );
  });

  it('gives the title of the kind when the operator wrote none', () => {
    expect(legalDocumentTitle(document('dpa', ''))).toBe('Data processing agreement');
  });
});
