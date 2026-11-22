import { vi } from 'vitest';
import {
  EMPTY_OPERATOR,
  withLegalRepository,
  type LegalDocument,
  type LegalInfo,
} from '@platform/legal';

/** A document in Markdown, with no version: `overrides` sets the rest. */
export const legalDocument = (
  kind: LegalDocument['kind'],
  overrides: Partial<LegalDocument> = {},
): LegalDocument => ({
  kind,
  title: '',
  content: { type: 'markdown', markdown: '# Text' },
  version: '',
  effectiveDate: null,
  acceptanceRequired: false,
  changes: '',
  updatedAt: null,
  ...overrides,
});

export const legalInfo = (...documents: LegalDocument[]): LegalInfo => ({
  operator: EMPTY_OPERATOR,
  privacyContact: '',
  documents,
});

/** The terms that each user must accept, at `version`, and a privacy policy. */
export const termsToAcceptAt = (
  version: string,
  effectiveDate: string | null = null,
  changes = '',
): LegalInfo =>
  legalInfo(
    legalDocument('privacy'),
    legalDocument('terms', { version, effectiveDate, changes, acceptanceRequired: true }),
  );

/**
 * Serves these legal settings, one for each read, then the last one again. Gives the fake read
 * and the function that restores the repository.
 */
export const withLegalInfo = (...infos: [LegalInfo, ...LegalInfo[]]) => {
  const info = vi.fn<() => Promise<LegalInfo>>();
  infos.forEach(each => info.mockResolvedValueOnce(each));
  info.mockResolvedValue(infos[infos.length - 1]);
  return { info, restore: withLegalRepository({ info, update: vi.fn() }) };
};
