import { t } from '@scylla/ui/i18n';
import {
  LEGAL_DOCUMENT_KINDS,
  isLegalDocumentKind,
  legalDocumentOf,
  legalDocumentTitle,
  legalKindTitles,
  legalLinks,
  type LegalDocumentKind,
  type LegalInfo,
  type LegalLink,
} from '@platform/legal';
import { formatDay } from '@shared/utils/date-utils.ts';
import { legalDocumentMessages as messages } from '../messages/legal-document.messages.ts';
import { parseMarkdown, tableOfContents, type Block, type Heading } from './markdown.presenter.ts';

/** The ids of the parts that the page adds to the text of the operator. */
export const OPERATOR_SECTION = 'legal-operator';
export const TRACKERS_SECTION = 'legal-trackers';

/** A line of the identity of the operator. */
export interface OperatorLine {
  label: string;
  value: string;
}

export type LegalPage =
  /** The kind is unknown, or the operator turned it off. */
  | { state: 'missing' }
  /** The document is a page of another site. */
  | { state: 'elsewhere'; title: string; url: string }
  | {
      state: 'page';
      kind: LegalDocumentKind;
      kindTitle: string;
      title: string;
      /** "Last updated on … · Version …", or empty. */
      meta: string;
      blocks: Block[];
      contents: Heading[];
      /** The legal notice: the identity of the operator, above the text. */
      operator: OperatorLine[];
      /** The cookie policy: the table of the trackers, under the text. */
      trackers: boolean;
      /** The other documents that are on. */
      others: LegalLink[];
    };

const operatorLines = (info: LegalInfo): OperatorLine[] => {
  const { operator } = info;
  const lines: Array<[string, string]> = [
    [t(messages.operatorName), operator.name],
    [t(messages.operatorAddress), operator.address],
    [t(messages.operatorRegistration), operator.registration],
    [t(messages.publicationDirector), operator.publicationDirector],
    [t(messages.operatorContact), operator.contact],
    [t(messages.operatorHost), operator.host],
    [t(messages.privacyContact), info.privacyContact],
  ];
  return lines.filter(([, value]) => value.trim()).map(([label, value]) => ({ label, value }));
};

/** The date of effect, else the date of the last change, and the version. */
const metaOf = (
  effectiveDate: string | null,
  updatedAt: string | null,
  version: string,
): string => {
  const day = effectiveDate ? `${effectiveDate}T12:00:00Z` : updatedAt;
  const parts = [
    day ? t(messages.updatedOn(formatDay(day))) : '',
    version ? t(messages.version(version)) : '',
  ];
  return parts.filter(Boolean).join(' · ');
};

/** What the page of a kind shows. */
export const legalPage = (info: LegalInfo, kindParam: string | undefined): LegalPage => {
  const kind = kindParam && isLegalDocumentKind(kindParam) ? kindParam : null;
  const document = kind ? legalDocumentOf(info, kind) : undefined;
  if (!kind || !document) return { state: 'missing' };

  // The frame of a page of another site is a text of the app: the title of the kind.
  const kindTitle = t(legalKindTitles[kind]);
  if (document.content.type === 'url') {
    return { state: 'elsewhere', title: kindTitle, url: document.content.url };
  }

  const blocks = parseMarkdown(document.content.markdown);
  const operator = kind === 'legal-notice' ? operatorLines(info) : [];
  const trackers = kind === 'cookies';
  const contents = [
    ...(operator.length > 0 ? [{ id: OPERATOR_SECTION, text: t(messages.operator) }] : []),
    ...tableOfContents(blocks),
    ...(trackers ? [{ id: TRACKERS_SECTION, text: t(messages.trackers) }] : []),
  ];
  const others = legalLinks(
    info,
    LEGAL_DOCUMENT_KINDS.filter(other => other !== kind),
  );

  return {
    state: 'page',
    kind,
    kindTitle,
    // The title of the operator heads its text, in the language of this text.
    title: legalDocumentTitle(document),
    meta: metaOf(document.effectiveDate, document.updatedAt, document.version),
    blocks,
    contents,
    operator,
    trackers,
    others,
  };
};
