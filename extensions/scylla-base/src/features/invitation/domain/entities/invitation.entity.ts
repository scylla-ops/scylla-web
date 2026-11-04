/** An open invitation to a workspace, by email. */
export interface InvitationEntity {
  id: string;
  workspaceId: string;
  email: string;
  /** The fixed role that the person gets when it accepts. */
  role: string;
  invitedBy: string;
  /** ISO times. The resend has a cooldown from `sentAt`. */
  expiresAt: string;
  sentAt: string;
}
