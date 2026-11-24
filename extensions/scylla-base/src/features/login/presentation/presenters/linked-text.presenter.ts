import { t } from '@scylla/ui/i18n';
import { legalDocumentHref, legalDocumentOf, termsToAccept, type LegalInfo } from '@platform/legal';
import { termsMessages as messages } from '../messages/terms.messages.ts';

/** A part of a sentence: a text, or the key of a link. */
export type LinkedPart = { kind: 'text'; text: string } | { kind: 'link'; key: string };

/** A link in a sentence. */
export interface TextLink {
  label: string;
  href: string;
}

/** The links of the acceptance of the terms: `terms` and `privacy`, when they are on. */
export type TermsLinks = Partial<Record<'terms' | 'privacy', TextLink>>;

const MARK = '\u0001';

/**
 * The value of a message that becomes a link: its key between two marks. The translated sentence
 * keeps the place of the link, and `linkedParts` finds it.
 */
export const linkSlot = (key: keyof TermsLinks): string => `${MARK}${key}${MARK}`;

/** Splits a translated sentence at its link slots, in their order. */
export const linkedParts = (sentence: string): LinkedPart[] =>
  sentence.split(MARK).flatMap((piece, index): LinkedPart[] => {
    if (index % 2 === 1) return [{ kind: 'link', key: piece }];
    return piece ? [{ kind: 'text', text: piece }] : [];
  });

/**
 * The links of the acceptance: the terms when each user must accept them, and the privacy policy
 * when it is on.
 */
export const termsLinks = (info: LegalInfo | undefined): TermsLinks => {
  const terms = termsToAccept(info);
  const privacy = legalDocumentOf(info, 'privacy');
  return {
    ...(terms && { terms: { label: t(messages.termsLink), href: legalDocumentHref(terms) } }),
    ...(privacy && {
      privacy: { label: t(messages.privacyLink), href: legalDocumentHref(privacy) },
    }),
  };
};
