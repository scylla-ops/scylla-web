/** A version of the terms of service that the user accepted. */
export interface TermsAcceptance {
  version: string;
  /** The time of the acceptance, ISO 8601, or empty. */
  acceptedAt: string;
}

/** The terms of service of the user of the session. */
export interface TermsStatus {
  /** The user must accept the current version before the app: the terms step shows. */
  acceptanceRequired: boolean;
  /** The last version that the user accepted, or `null`. */
  accepted: TermsAcceptance | null;
  /** The name and the email of the user, for the terms step. */
  displayName: string;
  email: string;
}
