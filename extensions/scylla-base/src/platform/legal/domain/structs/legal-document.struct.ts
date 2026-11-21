/** The kinds of legal document, in the order of the lists. Each kind has at most one document. */
export const LEGAL_DOCUMENT_KINDS = [
  'legal-notice',
  'privacy',
  'cookies',
  'terms',
  'terms-of-sale',
  'dpa',
  'subprocessors',
] as const;

/** The kind of a document, as in the path of its page: `/legal/<kind>`. */
export type LegalDocumentKind = (typeof LEGAL_DOCUMENT_KINDS)[number];

/** The kinds that a user can have to accept. The other kinds only inform. */
export const ACCEPTANCE_KINDS: readonly LegalDocumentKind[] = ['terms'];

/** Where the text of a document is: a page of another site, or a text that Scylla shows. */
export type LegalDocumentContent =
  { type: 'url'; url: string } | { type: 'markdown'; markdown: string };

/** A document that the operator turned on. A kind with no document is off: no page, no link. */
export interface LegalDocument {
  kind: LegalDocumentKind;
  /** Empty: the title of the kind. */
  title: string;
  content: LegalDocumentContent;
  /** Empty: no version. */
  version: string;
  /** The date of effect, `YYYY-MM-DD`, or `null`. */
  effectiveDate: string | null;
  /** Each user must accept this version. */
  acceptanceRequired: boolean;
  /** The time of the last change, ISO 8601, or `null`. */
  updatedAt: string | null;
}

export const isLegalDocumentKind = (value: string): value is LegalDocumentKind =>
  (LEGAL_DOCUMENT_KINDS as readonly string[]).includes(value);

/** The path of the page of a kind. */
export const legalPagePath = (kind: LegalDocumentKind): string => `/legal/${kind}`;

/** Where a link to a document goes: the page of another site, or the page of its kind. */
export const legalDocumentHref = (document: LegalDocument): string =>
  document.content.type === 'url' ? document.content.url : legalPagePath(document.kind);
