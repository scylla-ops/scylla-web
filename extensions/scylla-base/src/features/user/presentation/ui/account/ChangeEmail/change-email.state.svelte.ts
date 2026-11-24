import { createMutation, getModuleDomain, getQueryClient } from '@scylla/core-sdk';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
import type { UserModule } from '@base/features/user/user.module.ts';
import { ME_QUERY_KEY } from '@base/features/user/presentation/user.queries.ts';

export type ChangeEmailStep = 'confirming' | 'done' | 'invalid-link';

/** The token of the mail link, from the fragment, which leaves the address bar at once. */
const takeToken = (): string | null => {
  const { hash, pathname, search } = window.location;
  if (!hash) return null;
  history.replaceState(history.state, '', pathname + search);
  return new URLSearchParams(hash.slice(1)).get('token') || null;
};

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class ChangeEmailState {
  private readonly repository = getModuleDomain<typeof UserModule.domain>('user').userRepository;
  private readonly token = takeToken();

  /** A used or expired link is the page's own state: it must not reach the global toast. */
  private readonly mutation = createMutation<UserEntity | null, ScyllaError, string>(() => ({
    mutationFn: async (token: string) => {
      try {
        return await this.repository.confirmEmailChange(token);
      } catch (error) {
        if (ScyllaError.from(error).code === 'FAILED_PRECONDITION') return null;
        throw error;
      }
    },
    onSuccess: () => getQueryClient().invalidateQueries({ queryKey: ME_QUERY_KEY() }),
  }));

  get step(): ChangeEmailStep {
    if (!this.token || this.mutation.isError) return 'invalid-link';
    if (!this.mutation.isSuccess) return 'confirming';
    return this.mutation.data ? 'done' : 'invalid-link';
  }

  get email(): string {
    return this.mutation.data?.email ?? '';
  }

  start = (): void => {
    if (this.token && this.mutation.isIdle) this.mutation.mutate(this.token);
  };
}
