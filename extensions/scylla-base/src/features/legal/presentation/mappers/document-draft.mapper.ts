import type { LegalDocument, LegalDocumentChange, LegalDocumentKind } from '@platform/legal';

/** Off, a link, or a text in Markdown. */
export type DocumentMode = 'off' | 'url' | 'markdown';

/** What the form of a document holds. The form keeps the link and the text of both modes. */
export interface DocumentDraft {
  mode: DocumentMode;
  title: string;
  url: string;
  markdown: string;
  version: string;
  /** `YYYY-MM-DD`, or empty. */
  effectiveDate: string;
  acceptanceRequired: boolean;
  /** What changes in this version, one change on each line. */
  changes: string;
}

const HTTP_URL = /^https?:\/\/\S+$/i;

/** The form of a document that is on, or of a kind that is off. */
export const toDraft = (document: LegalDocument | undefined): DocumentDraft => ({
  mode: document?.content.type ?? 'off',
  title: document?.title ?? '',
  url: document?.content.type === 'url' ? document.content.url : '',
  markdown: document?.content.type === 'markdown' ? document.content.markdown : '',
  version: document?.version ?? '',
  effectiveDate: document?.effectiveDate ?? '',
  acceptanceRequired: document?.acceptanceRequired ?? false,
  changes: document?.changes ?? '',
});

/** The change that the form sends. Off sends no content: the server turns the kind off. */
export const toChange = (kind: LegalDocumentKind, draft: DocumentDraft): LegalDocumentChange => ({
  kind,
  title: draft.title.trim(),
  content:
    draft.mode === 'url'
      ? { type: 'url', url: draft.url.trim() }
      : draft.mode === 'markdown'
        ? { type: 'markdown', markdown: draft.markdown }
        : null,
  version: draft.version.trim(),
  effectiveDate: draft.effectiveDate,
  acceptanceRequired: draft.mode !== 'off' && draft.acceptanceRequired,
  changes: draft.changes.trim(),
});

/** The form changes nothing that the server holds. Off forgets the other fields. */
export const sameAsServer = (
  draft: DocumentDraft,
  document: LegalDocument | undefined,
): boolean => {
  const server = toDraft(document);
  if (draft.mode === 'off' || server.mode === 'off') return draft.mode === server.mode;
  const field = draft.mode === 'url' ? 'url' : 'markdown';
  return (
    draft.mode === server.mode &&
    draft[field] === server[field] &&
    draft.title.trim() === server.title &&
    draft.version.trim() === server.version &&
    draft.effectiveDate === server.effectiveDate &&
    draft.acceptanceRequired === server.acceptanceRequired &&
    draft.changes.trim() === server.changes
  );
};

/** A link must be an http or https address. */
export const urlIsValid = (draft: DocumentDraft): boolean =>
  draft.mode !== 'url' || HTTP_URL.test(draft.url.trim());
