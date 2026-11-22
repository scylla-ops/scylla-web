import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { LegalDocumentKind } from '../../domain/structs/legal-document.struct.ts';

/** The title of each kind: the title of a document that has none, and the name of the kind. */
export const legalKindTitles: Record<LegalDocumentKind, MessageDescriptor> = {
  'legal-notice': msg`Legal notice`,
  privacy: msg`Privacy policy`,
  cookies: msg`Cookie policy`,
  terms: msg`Terms of service`,
  'terms-of-sale': msg`Terms of sale`,
  dpa: msg`Data processing agreement`,
  subprocessors: msg`Sub-processors`,
};

/** The short label of a kind in a row of links. */
export const legalKindLinks: Record<LegalDocumentKind, MessageDescriptor> = {
  'legal-notice': msg`Legal notice`,
  privacy: msg({ context: 'legal-link', message: 'Privacy' }),
  cookies: msg({ context: 'legal-link', message: 'Cookies' }),
  terms: msg({ context: 'legal-link', message: 'Terms' }),
  'terms-of-sale': msg`Terms of sale`,
  dpa: msg({ context: 'legal-link', message: 'DPA' }),
  subprocessors: msg`Sub-processors`,
};

export const legalMessages = {
  legalAndPrivacy: msg`Legal and privacy`,
  footerLabel: msg`Legal documents`,
  copyright: (year: number, name: string) => msg`© ${year} ${name}`,
  saved: msg`The legal settings are saved`,
};
