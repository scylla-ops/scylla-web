import { ScyllaError } from '@shared/utils/scylla-error.ts';

/** The server refused the acceptance: the terms changed. */
export interface TermsRefusal {
  /** The current version that the server named: empty when it has none, or the terms are off. */
  currentVersion: string;
}

/**
 * For a call whose TERMS_NOT_ACCEPTED refusal the page shows itself, under the box: gives the
 * refusal as data instead of throwing it to the global error toast. `null` on success; any other
 * error throws.
 */
export const termsRefusalOf = async (call: Promise<unknown>): Promise<TermsRefusal | null> => {
  try {
    await call;
    return null;
  } catch (error) {
    const refusal = ScyllaError.from(error);
    if (refusal.reason !== 'TERMS_NOT_ACCEPTED') throw error;
    return { currentVersion: refusal.metadata.version ?? '' };
  }
};
