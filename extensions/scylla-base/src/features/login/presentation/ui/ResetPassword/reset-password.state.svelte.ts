import { createMutation, getModuleDomain } from '@scylla/core-sdk';
import { refusalOf, type ScyllaError } from '@shared/utils/scylla-error.ts';
import type { LoginModule } from '@base/features/login/login.module.ts';
import { takeFromFragment as takeTokenFromFragment } from '../../mappers/fragment-token.mapper.ts';

export type ResetPasswordStep = 'form' | 'done' | 'invalid-link';

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class ResetPasswordState {
  private readonly repository = getModuleDomain<typeof LoginModule.domain>('login').loginRepository;

  private token = $state<string | null>(takeTokenFromFragment() ?? null);
  private links = $state(0);

  /** The refusal is the page's own state: it must not reach the global error toast. */
  private readonly mutation = createMutation<string | null, ScyllaError, string>(() => ({
    mutationFn: async (newPassword: string) =>
      refusalOf(this.repository.resetPassword(this.token ?? '', newPassword)),
  }));

  get isPending(): boolean {
    return this.mutation.isPending;
  }

  get step(): ResetPasswordStep {
    if (!this.token) return 'invalid-link';
    if (!this.mutation.isSuccess) return 'form';
    return this.mutation.data === null ? 'done' : 'invalid-link';
  }

  /** Changes for each link the page reads: key the form on it, so that it starts empty. */
  get link(): number {
    return this.links;
  }

  submit = (newPassword: string): void => {
    this.mutation.mutate(newPassword);
  };

  /**
   * For `hashchange`. A second link opened in the same tab changes only the fragment: no page
   * load, so the page reads it here and starts again from the form.
   */
  readNewLink = (): void => {
    const token = takeTokenFromFragment();
    if (token === undefined) return;

    this.token = token;
    this.links += 1;
    this.mutation.reset();
  };
}
