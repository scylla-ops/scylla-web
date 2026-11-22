import {
  LegalDocumentKind as GrpcKind,
  type LegalDocument as GrpcDocument,
  type LegalInfo as GrpcInfo,
  type LegalOperator as GrpcOperator,
  type UpdateLegalSettingsRequest,
} from '@base/generated/scylla/platform/v1/legal_service.ts';
import { required, timestampToIsoOpt } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  LegalDocument,
  LegalDocumentContent,
  LegalDocumentKind,
} from '../domain/structs/legal-document.struct.ts';
import type {
  LegalDocumentChange,
  LegalInfo,
  LegalOperator,
  UpdateLegalSettingsInput,
} from '../domain/structs/legal-info.struct.ts';

const KINDS: ReadonlyArray<readonly [GrpcKind, LegalDocumentKind]> = [
  [GrpcKind.LEGAL_NOTICE, 'legal-notice'],
  [GrpcKind.PRIVACY, 'privacy'],
  [GrpcKind.COOKIES, 'cookies'],
  [GrpcKind.TERMS, 'terms'],
  [GrpcKind.TERMS_OF_SALE, 'terms-of-sale'],
  [GrpcKind.DPA, 'dpa'],
  [GrpcKind.SUBPROCESSORS, 'subprocessors'],
];

const kindToDomain = (kind: GrpcKind): LegalDocumentKind | undefined =>
  KINDS.find(([grpc]) => grpc === kind)?.[1];

const kindToGrpc = (kind: LegalDocumentKind): GrpcKind =>
  KINDS.find(([, domain]) => domain === kind)?.[0] ?? GrpcKind.UNSPECIFIED;

const contentToDomain = (content: GrpcDocument['content']): LegalDocumentContent | null => {
  if (content.oneofKind === 'url') return { type: 'url', url: content.url };
  if (content.oneofKind === 'markdown') return { type: 'markdown', markdown: content.markdown };
  return null;
};

const contentToGrpc = (content: LegalDocumentContent | null): GrpcDocument['content'] => {
  if (content?.type === 'url') return { oneofKind: 'url', url: content.url };
  if (content?.type === 'markdown') return { oneofKind: 'markdown', markdown: content.markdown };
  return { oneofKind: undefined };
};

/** A document of a kind that this build does not know, or with no content, is left out. */
const documentToDomain = (document: GrpcDocument): LegalDocument[] => {
  const kind = kindToDomain(document.kind);
  const content = contentToDomain(document.content);
  if (!kind || !content) return [];
  return [
    {
      kind,
      title: document.title,
      content,
      version: document.version,
      effectiveDate: document.effectiveDate || null,
      acceptanceRequired: document.acceptanceRequired,
      changes: document.changes,
      updatedAt: timestampToIsoOpt(document.updatedAt) ?? null,
    },
  ];
};

const operatorToDomain = (operator: GrpcOperator | undefined): LegalOperator => ({
  name: operator?.name ?? '',
  address: operator?.address ?? '',
  registration: operator?.registration ?? '',
  publicationDirector: operator?.publicationDirector ?? '',
  contact: operator?.contact ?? '',
  host: operator?.host ?? '',
});

export function toDomain(info: GrpcInfo | undefined): LegalInfo {
  const { operator, privacyContact, documents } = required(info, 'legal info');
  return {
    operator: operatorToDomain(operator),
    privacyContact,
    documents: documents.flatMap(documentToDomain),
  };
}

const changeToGrpc = (change: LegalDocumentChange): GrpcDocument => ({
  kind: kindToGrpc(change.kind),
  title: change.title,
  content: contentToGrpc(change.content),
  version: change.version,
  effectiveDate: change.effectiveDate,
  acceptanceRequired: change.acceptanceRequired,
  changes: change.changes,
});

export function updateToGrpc(input: UpdateLegalSettingsInput): UpdateLegalSettingsRequest {
  return {
    operator: input.operator && { ...input.operator },
    privacyContact: input.privacyContact,
    documents: (input.documents ?? []).map(changeToGrpc),
  };
}
