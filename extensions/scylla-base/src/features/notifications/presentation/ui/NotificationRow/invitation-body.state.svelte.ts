import { createMutation } from '@scylla/core-sdk';
import { invitationMutations, openJoinedWorkspace } from '@base/features/invitation';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { refreshNotifications } from '../../notifications.queries.ts';

/** Why the server refused an answer: `other-email` keeps the row, and `gone` refreshes the list. */
export type InvitationRefusal = 'other-email' | 'gone' | 'failed';

const refusalOf = (thrown: unknown): InvitationRefusal => {
  const error = ScyllaError.from(thrown);
  if (error.reason === 'INVITATION_FOR_ANOTHER_EMAIL') return 'other-email';
  return error.code === 'NOT_FOUND' ? 'gone' : 'failed';
};

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class InvitationBodyState {
  private readonly acceptCall = createMutation(() => ({
    ...invitationMutations.acceptById(),
    onSuccess: async (workspaceId: string) => {
      await openJoinedWorkspace(workspaceId);
      this.onJoined();
      await refreshNotifications();
    },
    onError: (error: Error) => this.settle(error),
  }));

  private readonly declineCall = createMutation(() => ({
    ...invitationMutations.decline(),
    onSuccess: refreshNotifications,
    onError: (error: Error) => this.settle(error),
  }));

  public refusal = $state<InvitationRefusal | null>(null);

  constructor(private readonly onJoined: () => void) {}

  get accepting(): boolean {
    return this.acceptCall.isPending;
  }

  get declining(): boolean {
    return this.declineCall.isPending;
  }

  accept = (invitationId: string): void => {
    this.refusal = null;
    this.acceptCall.mutate(invitationId);
  };

  decline = (invitationId: string): void => {
    this.refusal = null;
    this.declineCall.mutate(invitationId);
  };

  private settle(error: unknown): void {
    this.refusal = refusalOf(error);
    if (this.refusal === 'gone') void refreshNotifications();
  }
}
