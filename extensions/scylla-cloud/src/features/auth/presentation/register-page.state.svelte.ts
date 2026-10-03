import { createMutation, navigateTo } from '@scylla/core-sdk';
import type { ScyllaError } from '@scylla/base-sdk';
import { registrationMutations } from './registration.queries.ts';
import type { SignupInput } from '../domain/repository/registration.repository.ts';

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class RegisterPageState {
  private readonly mutation = createMutation<void, ScyllaError, SignupInput>(() => ({
    ...registrationMutations.signup(),
    // `/` redirects to the new organization; `replace` keeps this page out of the history.
    onSuccess: () => navigateTo('/', { replace: true }),
  }));

  get isPending(): boolean {
    return this.mutation.isPending;
  }

  /** From the accepted input until the redirect: the loading screen shows. */
  get isSuccess(): boolean {
    return this.mutation.isSuccess;
  }

  submit = (input: SignupInput): void => {
    this.mutation.mutate(input);
  };
}
