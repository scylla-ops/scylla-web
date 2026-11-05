/** The invitations to a workspace. Loaders only: a barrel must not re-export a component. */
export type { InvitationEntity } from './domain/entities/invitation.entity.ts';
export {
  invitationMutations,
  invitationQueries,
  INVITATIONS_QUERY_KEY,
  type InviteInput,
} from './presentation/invitation.queries.ts';
export const loadPendingInvitations = () =>
  import('./presentation/ui/PendingInvitations/PendingInvitations.svelte');
