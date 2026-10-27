import { createMutation, getModuleDomain } from '@scylla/core-sdk';
import { navigateTo } from '@platform/context';
import type { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { LoginModule } from '@base/features/login/login.module.ts';
import { returnPathOf } from '../mappers/return-path.mapper.ts';

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
    mutationFn: ({ identifier, password }: Credentials) =>
      this.repository.login(identifier, password),
    // The return path of `loginPath`, else `/`, which redirects to an organization.
    // `replace` keeps this page out of the history.
    onSuccess: () => navigateTo(returnPathOf(window.location.hash) ?? '/', { replace: true }),
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
