/** An account of the user at an identity provider, linked to its Scylla account. */
export interface IdentityEntity {
  /** The slug of the provider, as in `/auth/<slug>/start`. */
  provider: string;
  /** The id of the user at the provider. */
  subject: string;
  /** Empty when the provider gives none. */
  email: string;
  linkedAt: string;
}

/** The ways the user signs in: a password, and the identities. The last one cannot go. */
export interface SignInMethodsOfUser {
  identities: IdentityEntity[];
  hasPassword: boolean;
}
