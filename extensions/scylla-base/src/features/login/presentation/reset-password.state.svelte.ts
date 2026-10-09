import { createMutation, getModuleDomain } from '@scylla/core-sdk';
import { refusalOf, type ScyllaError } from '@shared/utils/scylla-result.ts';
import type { LoginModule } from '../login.module.ts';

export type ResetPasswordStep = 'form' | 'done' | 'invalid-link';

/**
 * The token of the reset link, from the URL fragment (`#token=…`), which the server never
 * receives. The fragment leaves the address bar at once, so the token is not left in the
 * history or on the screen. `undefined` when the URL has no fragment; `null` for a fragment
 * with no token.
 */
const takeTokenFromFragment = (): string | null | undefined => {
  const { hash, pathname, search } = window.location;
  if (!hash) return undefined;

  history.replaceState(history.state, '', pathname + search);
  return new URLSearchParams(hash.slice(1)).get('token') || null;
};

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class ResetPasswordState {
  private readonly repository = getModuleDomain<typeof LoginModule.domain>('login').loginRepository;

  private token = $state<string | null>(takeTokenFromFragment() ?? null);
  private links = $state(0);

  /** The refusal is the page's own state: it must not reach the global error toast. */
  private readonly mutation = createMutation<string | null, ScyllaError, string>(() => ({
    mutationFn: async (newPassword: string) =>
      refusalOf(await this.repository.resetPassword(this.token ?? '', newPassword)),
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
