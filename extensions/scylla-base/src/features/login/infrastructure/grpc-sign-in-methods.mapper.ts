import type { ListSignInMethodsResponse } from '@base/generated/scylla/accounts/v1/account_service.ts';
import type {
  SignInMethods,
  SignInProvider,
  SignUpMode,
} from '@base/features/login/domain/structs/sign-in-methods.struct.ts';

const kindOf = (kind: string): SignInProvider['kind'] =>
  kind === 'oidc' || kind === 'github' ? kind : 'other';

/** An unknown mode is `closed`: the page then shows no sign-up link. */
const modeOf = (mode: string): SignUpMode =>
  mode === 'open' || mode === 'invite_only' ? mode : 'closed';

export function signInMethodsToDomain(response: ListSignInMethodsResponse): SignInMethods {
  return {
    providers: response.providers.map(({ slug, displayName, kind }) => ({
      slug,
      displayName,
      kind: kindOf(kind),
    })),
    signUpMode: modeOf(response.signUpMode),
  };
}
