import { createMutation, createQuery, getModuleDomain } from '@scylla/core-sdk';
import type { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { LoginModule } from '@base/features/login/login.module.ts';
import { loginQueries } from '../../login.queries.ts';
import { resendOutcomeOf, type ResendOutcome } from '../../mappers/resend-outcome.mapper.ts';

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class ResendVerificationState {
  private readonly repository = getModuleDomain<typeof LoginModule.domain>('login').loginRepository;

  private readonly methods = createQuery(() => loginQueries.signInMethods());

  /** The rate limit is the page's own state: its text is in the language of the page. */
  private readonly mutation = createMutation<ResendOutcome, ScyllaError, string>(() => ({
    mutationFn: (email: string) =>
      resendOutcomeOf(this.repository.resendVerificationEmail(email.trim())),
  }));

  /** The address that the mails come from: empty until the server tells it. */
  get sender(): string {
    return this.methods.data?.mailSender ?? '';
  }

  get isPending(): boolean {
    return this.mutation.isPending;
  }

  /** The server took the request. The answer does not tell whether the account exists. */
  get isSent(): boolean {
    return this.mutation.data === 'sent';
  }

  /** Too many requests for this email or from this address. */
  get isLimited(): boolean {
    return this.mutation.data === 'limited';
  }

  send = (email: string): void => {
    this.mutation.mutate(email);
  };
}
