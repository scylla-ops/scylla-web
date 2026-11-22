import { Timestamp } from '@base/generated/google/protobuf/timestamp.ts';
import {
  ConsentAction as GrpcConsentAction,
  ConsentSource as GrpcConsentSource,
  type RecordConsentRequest,
  type RecordConsentResponse,
} from '@base/generated/scylla/platform/v1/consent_service.ts';
import { idValue, required, wrapIdOpt } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  ConsentAction,
  ConsentChoice,
  ConsentSource,
  RecordConsentInput,
} from '../domain/structs/consent-choice.struct.ts';

const ACTIONS: Record<ConsentAction, GrpcConsentAction> = {
  'accept-all': GrpcConsentAction.ACCEPT_ALL,
  'reject-all': GrpcConsentAction.REJECT_ALL,
  custom: GrpcConsentAction.CUSTOM,
  withdraw: GrpcConsentAction.WITHDRAW,
};

const SOURCES: Record<ConsentSource, GrpcConsentSource> = {
  banner: GrpcConsentSource.BANNER,
  preferences: GrpcConsentSource.PREFERENCES,
  account: GrpcConsentSource.ACCOUNT,
};

/** The record of a choice, with the SHA-256 of the text that the person saw. */
export const recordToGrpc = (
  input: RecordConsentInput,
  bannerHash: string,
): RecordConsentRequest => ({
  consentId: wrapIdOpt(input.id ?? undefined),
  bannerVersion: input.version,
  bannerHash,
  choices: Object.entries(input.grants).map(([purpose, granted]) => ({
    purpose,
    granted: granted === true,
  })),
  action: ACTIONS[input.action],
  source: SOURCES[input.source],
});

/** The choice that the browser keeps: the consent id and the time come from the server. */
export const toChoice = (
  response: RecordConsentResponse,
  input: RecordConsentInput,
): ConsentChoice => ({
  id: required(idValue(response.consentId), 'consent id'),
  version: input.version,
  chosenAt: Timestamp.toDate(required(response.recordedAt, 'record time')).toISOString(),
  grants: { ...input.grants },
});
