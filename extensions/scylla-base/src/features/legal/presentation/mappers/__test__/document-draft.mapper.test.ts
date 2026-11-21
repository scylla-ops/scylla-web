// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { LegalDocument } from '@platform/legal';
import { sameAsServer, toChange, toDraft, urlIsValid } from '../document-draft.mapper.ts';

const terms: LegalDocument = {
  kind: 'terms',
  title: 'Terms',
  content: { type: 'markdown', markdown: '# Terms' },
  version: '2.0',
  effectiveDate: '2027-01-01',
  acceptanceRequired: true,
  updatedAt: '2026-11-20T10:00:00.000Z',
};

describe('the draft of a document', () => {
  it('goes from the server to the form and back with no change', () => {
    const draft = toDraft(terms);

    expect(sameAsServer(draft, terms)).toBe(true);
    expect(toChange('terms', draft)).toEqual({
      kind: 'terms',
      title: 'Terms',
      content: { type: 'markdown', markdown: '# Terms' },
      version: '2.0',
      effectiveDate: '2027-01-01',
      acceptanceRequired: true,
    });
  });

  it('turns a kind off with no content, and forgets the other fields', () => {
    const draft = { ...toDraft(terms), mode: 'off' as const };

    expect(sameAsServer(draft, terms)).toBe(false);
    expect(sameAsServer(draft, undefined)).toBe(true);
    expect(toChange('terms', draft)).toMatchObject({ content: null, acceptanceRequired: false });
  });

  it('sees a new version as a change, and needs an http address for a link', () => {
    expect(sameAsServer({ ...toDraft(terms), version: '2.1' }, terms)).toBe(false);

    const link = { ...toDraft(undefined), mode: 'url' as const };
    expect(urlIsValid({ ...link, url: 'ftp://acme.example' })).toBe(false);
    expect(urlIsValid({ ...link, url: ' https://acme.example/terms ' })).toBe(true);
    expect(toChange('privacy', { ...link, url: ' https://acme.example ' }).content).toEqual({
      type: 'url',
      url: 'https://acme.example',
    });
  });
});
