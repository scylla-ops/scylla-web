import { t } from '@scylla/ui/i18n';
import {
  LEGAL_DOCUMENT_KINDS,
  legalDocumentHref,
  type LegalDocument,
  type LegalDocumentKind,
} from '../../domain/structs/legal-document.struct.ts';
import { legalDocumentOf, type LegalInfo } from '../../domain/structs/legal-info.struct.ts';
import { legalKindLinks, legalKindTitles } from '../messages/legal.messages.ts';

/** The kinds of the row of links under the public pages. */
export const FOOTER_KINDS: readonly LegalDocumentKind[] = [
  'legal-notice',
  'privacy',
  'cookies',
  'terms',
];

/** A link to a document that is on. */
export interface LegalLink {
  kind: LegalDocumentKind;
  /** The short label or the title of the kind, in the language of the UI. */
  label: string;
  href: string;
  /** A page of another site: it opens in a new tab. */
  external: boolean;
}

/**
 * The title of a document: its own, else the title of its kind. The operator writes its title in
 * one language: only the page of the document shows it, above its text.
 */
export const legalDocumentTitle = (document: LegalDocument): string =>
  document.title || t(legalKindTitles[document.kind]);

/**
 * The links to the documents of these kinds that are on, in their order. The label is the short
 * label of the kind with `short`, else the title of the kind: never the title of the operator,
 * which has one language, so that the links follow the language of the UI.
 */
export const legalLinks = (
  info: LegalInfo | undefined,
  kinds: readonly LegalDocumentKind[] = LEGAL_DOCUMENT_KINDS,
  short = false,
): LegalLink[] =>
  kinds.flatMap(kind => {
    const document = legalDocumentOf(info, kind);
    if (!document) return [];
    return [
      {
        kind,
        label: t((short ? legalKindLinks : legalKindTitles)[kind]),
        href: legalDocumentHref(document),
        external: document.content.type === 'url',
      },
    ];
  });
