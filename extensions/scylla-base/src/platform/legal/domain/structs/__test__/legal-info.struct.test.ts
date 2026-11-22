import { describe, it, expect } from 'vitest';
import type { LegalDocument } from '../legal-document.struct.ts';
import { EMPTY_OPERATOR, termsToAccept, type LegalInfo } from '../legal-info.struct.ts';

const terms = (acceptanceRequired: boolean): LegalDocument => ({
  kind: 'terms',
  title: '',
  content: { type: 'markdown', markdown: '# Terms' },
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

describe('termsToAccept', () => {
  it('gives the terms when they need an acceptance', () => {
    expect(termsToAccept(info(terms(true)))?.version).toBe('2.0');
  });

  it('gives nothing when the terms are off, inform only, or are not read yet', () => {
    expect(termsToAccept(info())).toBeUndefined();
    expect(termsToAccept(info(terms(false)))).toBeUndefined();
    expect(termsToAccept(undefined)).toBeUndefined();
  });
});
