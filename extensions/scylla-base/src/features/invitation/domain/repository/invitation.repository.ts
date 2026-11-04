import type { InvitationEntity } from '../entities/invitation.entity.ts';

export interface InvitationRepository {
  /** FAILED_PRECONDITION with INVITATION_PENDING when an open one has the email. */
  create(workspaceId: string, email: string, role: string): Promise<InvitationEntity>;
  list(workspaceId: string): Promise<InvitationEntity[]>;
  revoke(workspaceId: string, invitationId: string): Promise<void>;
  /** FAILED_PRECONDITION with RESEND_TOO_SOON during the cooldown. */
  resend(workspaceId: string, invitationId: string): Promise<InvitationEntity>;
  /** Gives the workspace that the user of the session joins. */
  accept(token: string): Promise<string>;
}
