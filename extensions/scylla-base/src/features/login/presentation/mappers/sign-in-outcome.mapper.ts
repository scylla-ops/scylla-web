import { ScyllaError } from '@shared/utils/scylla-error.ts';

/** The end of a sign-in that the page shows: a session, or an account that waits for its check. */
export type SignInOutcome = 'signed-in' | 'email-not-verified';

/**
 * For a sign-in whose EMAIL_NOT_VERIFIED refusal the page shows itself, with a button that sends
 * the link again: gives the refusal as data instead of throwing it to the global error toast. Any
 * other error throws.
 */
export const signInOutcomeOf = async (call: Promise<void>): Promise<SignInOutcome> => {
  try {
    await call;
    return 'signed-in';
  } catch (error) {
    if (ScyllaError.from(error).reason !== 'EMAIL_NOT_VERIFIED') throw error;
    return 'email-not-verified';
  }
};
