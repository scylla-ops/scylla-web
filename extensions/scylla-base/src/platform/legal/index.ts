/**
 * The legal settings of the server: the documents that the operator turned on, its identity and
 * its privacy contact. Anyone reads them, with no session (`GetLegalInfo`).
 */
export {
  ACCEPTANCE_KINDS,
  LEGAL_DOCUMENT_KINDS,
  isLegalDocumentKind,
  legalDocumentHref,
  legalPagePath,
  type LegalDocument,
  type LegalDocumentContent,
  type LegalDocumentKind,
} from './domain/structs/legal-document.struct.ts';
export {
  EMPTY_OPERATOR,
  legalDocumentOf,
  type LegalDocumentChange,
  type LegalInfo,
  type LegalOperator,
  type UpdateLegalSettingsInput,
} from './domain/structs/legal-info.struct.ts';
export type { LegalRepository } from './domain/repository/legal.repository.ts';
export { withLegalRepository } from './legal-repository.ts';
export {
  LEGAL_INFO_QUERY_KEY,
  legalMutations,
  legalQueries,
} from './presentation/legal.queries.ts';
export {
  legalKindLinks,
  legalKindTitles,
  legalMessages,
} from './presentation/messages/legal.messages.ts';
export {
  FOOTER_KINDS,
  legalDocumentTitle,
  legalLinks,
  type LegalLink,
} from './presentation/presenters/legal-links.presenter.ts';
export { default as LegalFooter } from './presentation/ui/LegalFooter/LegalFooter.svelte';
