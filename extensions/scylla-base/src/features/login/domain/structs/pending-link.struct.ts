/** A link of a provider to an account that waits for its password, in a cookie of this browser. */
export interface PendingLink {
  providerName: string;
  /** The verified email that the provider gave: the email of the account. */
  email: string;
  /** The name that the provider gave, or an empty text. */
  displayName: string;
}
