import type { TrackerNeedingConsent } from '@platform/trackers';
import type { IConsentServiceClient } from '@base/generated/scylla/platform/v1/consent_service.client.ts';
import type { ConsentRepository } from '../domain/repository/consent.repository.ts';
import type {
  ConsentChoice,
  ConsentState,
  RecordConsentInput,
} from '../domain/structs/consent-choice.struct.ts';
import { readChoice, removeTrackers, writeChoice } from './consent-cookie.ts';
import * as grpcConsent from './grpc-consent.mapper.ts';
import { sha256 } from './sha256.ts';

/**
 * The choice is in a cookie of the browser, and the server keeps a record of each choice. The
 * browser is read at each call, so importing the module needs no DOM.
 */
export class DefaultConsentRepository implements ConsentRepository {
  constructor(
    private readonly client: IConsentServiceClient,
    private readonly browser: () => Document = () => document,
  ) {}

  public state(): Promise<ConsentState> {
    const doc = this.browser();
    const navigator = doc.defaultView?.navigator;
    return Promise.resolve({
      choice: readChoice(doc),
      // A browser with no support has no value: no signal.
      globalPrivacyControl:
        navigator !== undefined &&
        'globalPrivacyControl' in navigator &&
        navigator.globalPrivacyControl === true,
    });
  }

  public async record(input: RecordConsentInput): Promise<ConsentChoice> {
    const request = grpcConsent.recordToGrpc(input, sha256(input.text));
    const response = await this.client.recordConsent(request).response;
    const choice = grpcConsent.toChoice(response, input);
    writeChoice(this.browser(), choice);
    return choice;
  }

  public forget(trackers: readonly TrackerNeedingConsent[]): Promise<void> {
    removeTrackers(this.browser(), trackers);
    return Promise.resolve();
  }
}
