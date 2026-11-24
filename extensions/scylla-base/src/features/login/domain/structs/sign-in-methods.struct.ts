/** An identity provider on the sign-in page. */
export interface SignInProvider {
  /** The key of the provider in the URL: `/auth/<slug>/start`. */
  slug: string;
  displayName: string;
  kind: 'oidc' | 'github' | 'other';
}

/** Who can create an account: anyone, an invited person only, or nobody. */
export type SignUpMode = 'open' | 'invite_only' | 'closed';

export interface SignInMethods {
  providers: SignInProvider[];
  signUpMode: SignUpMode;
}
