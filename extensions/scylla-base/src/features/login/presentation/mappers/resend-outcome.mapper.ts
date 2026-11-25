import { ScyllaError } from '@shared/utils/scylla-error.ts';

/** The answer of a request of a new link: sent, or refused by the rate limit of the server. */
export type ResendOutcome = 'sent' | 'limited';

/**
 * For a request of a new link whose RESOURCE_EXHAUSTED the page shows itself, in the language of
 * the page: gives it as data instead of throwing it to the global error toast. Any other error
 * throws.
 */
export const resendOutcomeOf = async (call: Promise<void>): Promise<ResendOutcome> => {
  try {
    await call;
    return 'sent';
  } catch (error) {
    if (ScyllaError.from(error).code !== 'RESOURCE_EXHAUSTED') throw error;
    return 'limited';
  }
};
