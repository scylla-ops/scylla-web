/**
 * How the server delivers its reset links: by mail, or in its log for an operator to pass on.
 * It depends on the server only, never on the account. `unknown` for a server that does not say.
 */
export type PasswordResetDelivery = 'mail' | 'server-log' | 'unknown';
