import { getModuleDomain, mutationOptions } from '@scylla/core-sdk';
import type { ScyllaError } from '@scylla/base-sdk';
import type { CloudAuthModule } from '../auth.module.ts';
import type { SignupInput } from '../domain/repository/registration.repository.ts';

export const registrationMutations = {
  signup: () =>
    mutationOptions<void, ScyllaError, SignupInput>({
      mutationFn: async (input: SignupInput) =>
        (
          await getModuleDomain<typeof CloudAuthModule.domain>('cloud-auth').registrationRepository.signup(
            input,
          )
        ).unwrap(),
      // No `onSuccess`/`onError`: the view model redirects, the global handler toasts.
    }),
};
