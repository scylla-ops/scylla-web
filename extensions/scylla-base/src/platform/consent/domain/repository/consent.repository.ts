import type { TrackerNeedingConsent } from '@platform/trackers';
import type {
  ConsentChoice,
  ConsentState,
  RecordConsentInput,
} from '../structs/consent-choice.struct.ts';

export interface ConsentRepository {
  /** The choice of this browser and its Global Privacy Control. It reads the browser only. */
  state(): Promise<ConsentState>;
  /**
   * Records a choice on the server, with the user of the session when there is one, then keeps
   * it in this browser. A withdrawal is a new record: the records before it stay.
   */
  record(input: RecordConsentInput): Promise<ConsentChoice>;
  /** Removes the cookies and the storage keys of these trackers from this browser. */
  forget(trackers: readonly TrackerNeedingConsent[]): Promise<void>;
}
