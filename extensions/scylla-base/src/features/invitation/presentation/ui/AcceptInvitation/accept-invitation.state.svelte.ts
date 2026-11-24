import { createMutation, getModuleDomain } from '@scylla/core-sdk';
import { hasSession, loginPath } from '@base/features/login';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { InvitationModule } from '../../../invitation.module.ts';
import { openJoinedWorkspace } from '../../open-joined-workspace.ts';

/** A used, expired or unknown link, or a link for another email. */
const REFUSALS = new Set(['FAILED_PRECONDITION', 'NOT_FOUND', 'INVALID_ARGUMENT']);

export type AcceptStep = 'checking' | 'signed-out' | 'accepting' | 'invalid-link';

/**
 * The token of the link, from the fragment (`#token=…`), which the server never receives. It
 * leaves the address bar at once.
 */
const takeToken = (): string | null => {
  const { hash, pathname, search } = window.location;
  if (!hash) return null;
  history.replaceState(history.state, '', pathname + search);
  return new URLSearchParams(hash.slice(1)).get('token') || null;
};

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class AcceptInvitationState {
  private readonly repository =
    getModuleDomain<typeof InvitationModule.domain>('invitation').invitationRepository;

  private readonly token = takeToken();
  private signedIn = $state<boolean | null>(null);

  /** The refusal is the page's own state: it must not reach the global error toast. */
  private readonly mutation = createMutation<string | null, ScyllaError, string>(() => ({
    mutationFn: async (token: string) => {
      let workspaceId: string;
      try {
        workspaceId = await this.repository.accept(token);
      } catch (error) {
        const refusal = ScyllaError.from(error);
        if (REFUSALS.has(refusal.code)) return refusal.userMessage();
        throw error;
      }
      await openJoinedWorkspace(workspaceId);
      return null;
    },
  }));

  get step(): AcceptStep {
    if (!this.token) return 'invalid-link';
    if (this.signedIn === null) return 'checking';
    if (!this.signedIn) return 'signed-out';
    if (this.mutation.isError || (this.mutation.isSuccess && this.mutation.data !== null))
      return 'invalid-link';
    return 'accepting';
  }

  /** The sign-in page, then back here with the same link. */
  get signInHref(): string {
    return loginPath(`/accept-invitation#token=${encodeURIComponent(this.token ?? '')}`);
  }

  /** The sign-up page, with the invitation: the new account joins the workspace. */
  get signUpHref(): string {
    return `/sign-up#invitation=${encodeURIComponent(this.token ?? '')}`;
  }

  /** Checks the session, then accepts the link one time. */
  start = async (): Promise<void> => {
    if (!this.token) return;
    this.signedIn = await hasSession().catch(() => false);
    if (this.signedIn && this.mutation.isIdle) this.mutation.mutate(this.token);
  };
}
