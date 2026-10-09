import { createMutation, getModuleDomain } from '@scylla/core-sdk';
import { navigateTo } from '@platform/context';
import type { ScyllaError } from '@shared/utils/scylla-result.ts';
import type { LoginModule } from '../login.module.ts';

export interface Credentials {
  /** An email or a username. */
  identifier: string;
  password: string;
}

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class LoginState {
  private readonly repository = getModuleDomain<typeof LoginModule.domain>('login')
    .loginRepository;

  private readonly mutation = createMutation<void, ScyllaError, Credentials>(() => ({
    mutationFn: async ({ identifier, password }: Credentials) =>
      (await this.repository.login(identifier, password)).unwrap(),
    // `/` redirects to an organization; `replace` keeps this page out of the history.
    onSuccess: () => navigateTo('/', { replace: true }),
    // No `onError`: the global handler toasts.
  }));

  get isPending(): boolean {
    return this.mutation.isPending;
  }

  /** From the accepted credentials until the redirect: the loading screen shows. */
  get isSuccess(): boolean {
    return this.mutation.isSuccess;
  }

  submit = (identifier: string, password: string): void => {
    this.mutation.mutate({ identifier, password });
  };
}
