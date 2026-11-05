import { getModuleDomain, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type { LoginModule } from '../login.module.ts';

const repository = () => getModuleDomain<typeof LoginModule.domain>('login').loginRepository;

export const SIGN_IN_METHODS_QUERY_KEY = () => ['sign-in-methods'] as const;

export const loginMutations = {
  /**
   * The page shows its own refusal: a wrong password keeps the link. At the end, a full load of the
   * page of the start reads the session in its cookie.
   */
  linkPendingIdentity: () =>
    mutationOptions({
      mutationFn: (password: string) => repository().linkPendingIdentity(password),
      onSuccess: (page: string) => {
        window.location.assign(page);
      },
      meta: { showsOwnError: true },
    }),
};

export const loginQueries = {
  /** The link that waits in a cookie of this browser. Needs no session. */
  pendingLink: () =>
    queryOptions({
      queryKey: ['pending-link'] as const,
      queryFn: () => repository().pendingLink(),
      retry: false,
      staleTime: 0,
      meta: { showsOwnError: true },
    }),
  /** The identity providers and the sign-up mode. Needs no session. */
  signInMethods: () =>
    queryOptions({
      queryKey: SIGN_IN_METHODS_QUERY_KEY(),
      queryFn: () => repository().listSignInMethods(),
      staleTime: Infinity,
    }),
};
