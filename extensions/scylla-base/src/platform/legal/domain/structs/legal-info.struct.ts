import type {
  LegalDocument,
  LegalDocumentContent,
  LegalDocumentKind,
} from './legal-document.struct.ts';

/** The organization or the person that runs the server. Each field can be empty. */
export interface LegalOperator {
  /** The legal name and the legal form. */
  name: string;
  /** The registered address, one line or more. */
  address: string;
  /** The registration number, the share capital and the VAT number. */
  registration: string;
  publicationDirector: string;
  /** An email address or a phone number. */
  contact: string;
  /** The name, the address and the phone number of the host of the servers. */
  host: string;
}

/** What the server tells anyone, with no session: the legal settings of the server. */
export interface LegalInfo {
  operator: LegalOperator;
  /** An email address or a page, or empty. */
  privacyContact: string;
  /** The documents that are on, in the order of the kinds. */
  documents: LegalDocument[];
}

/** The new values of one document, or `content: null` to turn its kind off. */
export interface LegalDocumentChange {
  kind: LegalDocumentKind;
  title: string;
  content: LegalDocumentContent | null;
  version: string;
  /** `YYYY-MM-DD`, or empty. */
  effectiveDate: string;
  acceptanceRequired: boolean;
}

/** A change of the legal settings. A field that is absent does not change. */
export interface UpdateLegalSettingsInput {
  operator?: LegalOperator;
  privacyContact?: string;
  documents?: LegalDocumentChange[];
}

export const EMPTY_OPERATOR: LegalOperator = {
  name: '',
  address: '',
  registration: '',
  publicationDirector: '',
  contact: '',
  host: '',
};

/** The document of a kind, or `undefined` when the kind is off. */
export const legalDocumentOf = (
  info: LegalInfo | undefined,
  kind: LegalDocumentKind,
): LegalDocument | undefined => info?.documents.find(document => document.kind === kind);

/**
 * The terms of service that each user must accept: the document `terms` when it is on and needs an
 * acceptance, else `undefined`. Its `version` can be empty.
 */
export const termsToAccept = (info: LegalInfo | undefined): LegalDocument | undefined => {
  const terms = legalDocumentOf(info, 'terms');
  return terms?.acceptanceRequired ? terms : undefined;
};
