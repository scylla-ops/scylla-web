import { createMutation, getModuleDomain } from '@scylla/core-sdk';
import { refusalOf, type ScyllaError } from '@shared/utils/scylla-error.ts';
import type { LoginModule } from '@base/features/login/login.module.ts';
import { takeFromFragment } from '../../mappers/fragment-token.mapper.ts';

export type VerifyEmailStep = 'verifying' | 'done' | 'invalid-link';

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class VerifyEmailState {
  private readonly repository = getModuleDomain<typeof LoginModule.domain>('login').loginRepository;

  private readonly token = takeFromFragment() ?? null;

  /** The refusal is the page's own state: it must not reach the global error toast. */
  private readonly mutation = createMutation<string | null, ScyllaError, string>(() => ({
    mutationFn: (token: string) => refusalOf(this.repository.verifyEmail(token)),
  }));

  get step(): VerifyEmailStep {
    if (!this.token || this.mutation.isError) return 'invalid-link';
    if (!this.mutation.isSuccess) return 'verifying';
    return this.mutation.data === null ? 'done' : 'invalid-link';
  }

  /** Sends the token of the link one time, when the page opens. */
  start = (): void => {
    if (this.token && this.mutation.isIdle) this.mutation.mutate(this.token);
  };
}
