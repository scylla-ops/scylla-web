import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@platform/grpc';
import { InvitationServiceClient } from '@base/generated/scylla/workspaces/v1/invitation_service.client.ts';
import { DefaultInvitationRepository } from './infrastructure/default-invitation.repository.ts';

const invitationRepository = new DefaultInvitationRepository(
  new InvitationServiceClient(grpcTransport.getTransport()),
);

/**
 * The invitations to a workspace. The members page shows the invite button and the open
 * invitations; the link of the mail opens `accept-invitation`.
 */
export const InvitationModule = {
  id: 'invitation',
  domain: {
    invitationRepository,
  },
  routes: {
    public: [
      {
        // The path of the link in the mail of the server: keep it.
        path: 'accept-invitation',
        page: () => import('./presentation/ui/AcceptInvitation/AcceptInvitation.page.svelte'),
      },
    ],
  },
} satisfies ScyllaModule;
