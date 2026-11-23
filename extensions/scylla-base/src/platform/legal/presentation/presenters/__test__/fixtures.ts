import type {
  LegalDocument,
  LegalDocumentKind,
} from '../../../domain/structs/legal-document.struct.ts';
import { EMPTY_OPERATOR, type LegalInfo } from '../../../domain/structs/legal-info.struct.ts';

/** A document that is on, with the title that its operator wrote. */
export const document = (
  kind: LegalDocumentKind,
  title: string,
  content: LegalDocument['content'] = { type: 'markdown', markdown: 'text' },
): LegalDocument => ({
  kind,
  title,
  content,
  version: '',
  effectiveDate: null,
  acceptanceRequired: false,
  changes: '',
  updatedAt: null,
});

export const info = (...documents: LegalDocument[]): LegalInfo => ({
  operator: EMPTY_OPERATOR,
  privacyContact: '',
  documents,
});
