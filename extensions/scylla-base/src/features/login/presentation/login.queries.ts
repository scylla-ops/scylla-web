import { getModuleDomain, queryOptions } from '@scylla/core-sdk';
import type { LoginModule } from '../login.module.ts';

const repository = () => getModuleDomain<typeof LoginModule.domain>('login').loginRepository;

export const SIGN_IN_METHODS_QUERY_KEY = () => ['sign-in-methods'] as const;

export const loginQueries = {
  /** The identity providers and the sign-up mode. Needs no session. */
  signInMethods: () =>
    queryOptions({
      queryKey: SIGN_IN_METHODS_QUERY_KEY(),
      queryFn: () => repository().listSignInMethods(),
      staleTime: Infinity,
    }),
};
