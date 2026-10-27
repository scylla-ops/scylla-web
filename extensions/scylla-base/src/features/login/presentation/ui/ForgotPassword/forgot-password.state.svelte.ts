import { createMutation, getModuleDomain } from '@scylla/core-sdk';
import type { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { PasswordResetDelivery } from '@base/features/login/domain/structs/password-reset.struct.ts';
import type { LoginModule } from '@base/features/login/login.module.ts';

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class ForgotPasswordState {
  private readonly repository = getModuleDomain<typeof LoginModule.domain>('login').loginRepository;

  private readonly mutation = createMutation<PasswordResetDelivery, ScyllaError, string>(() => ({
    mutationFn: (email: string) => this.repository.requestPasswordReset(email.trim()),
  }));

  get isPending(): boolean {
    return this.mutation.isPending;
  }

  /** `undefined` until the server answered. The answer does not tell whether the account exists. */
  get delivery(): PasswordResetDelivery | undefined {
    return this.mutation.data;
  }

  submit = (email: string): void => {
    this.mutation.mutate(email);
  };
}
