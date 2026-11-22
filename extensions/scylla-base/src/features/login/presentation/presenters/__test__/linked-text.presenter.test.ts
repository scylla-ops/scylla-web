import { describe, it, expect } from 'vitest';
import { EMPTY_OPERATOR, type LegalDocument, type LegalInfo } from '@platform/legal';
import { linkSlot, linkedParts, termsLinks } from '../linked-text.presenter.ts';

const document = (kind: LegalDocument['kind'], acceptanceRequired = false): LegalDocument => ({
  kind,
  title: '',
  content: { type: 'markdown', markdown: '# Text' },
  version: '2.0',
  effectiveDate: null,
  acceptanceRequired,
  changes: '',
  updatedAt: null,
});

const info = (...documents: LegalDocument[]): LegalInfo => ({
  operator: EMPTY_OPERATOR,
  privacyContact: '',
  documents,
});

describe('linkedParts', () => {
  it('splits a sentence at its links, in their order', () => {
    const sentence = `Read the ${linkSlot('terms')} and the ${linkSlot('privacy')}.`;

    expect(linkedParts(sentence)).toEqual([
      { kind: 'text', text: 'Read the ' },
      { kind: 'link', key: 'terms' },
      { kind: 'text', text: ' and the ' },
      { kind: 'link', key: 'privacy' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('keeps a link at an end of the sentence, and a sentence with no link', () => {
    expect(linkedParts(`I accept the ${linkSlot('terms')}`)).toEqual([
      { kind: 'text', text: 'I accept the ' },
      { kind: 'link', key: 'terms' },
    ]);
    expect(linkedParts('No link.')).toEqual([{ kind: 'text', text: 'No link.' }]);
  });
});

describe('termsLinks', () => {
  it('links the terms to accept and the privacy policy that is on', () => {
    expect(termsLinks(info(document('privacy'), document('terms', true)))).toEqual({
      terms: { label: 'Terms of service', href: '/legal/terms' },
      privacy: { label: 'Privacy policy', href: '/legal/privacy' },
    });
  });

  it('links no privacy policy that is off', () => {
    expect(termsLinks(info(document('terms', true)))).toEqual({
      terms: { label: 'Terms of service', href: '/legal/terms' },
    });
  });

  it('links no terms that need no acceptance', () => {
    expect(termsLinks(info(document('privacy'), document('terms')))).toEqual({
      privacy: { label: 'Privacy policy', href: '/legal/privacy' },
    });
    expect(termsLinks(undefined)).toEqual({});
  });
});
