import type { InvitationRepository } from '@base/features/invitation/domain/repository/invitation.repository.ts';
import type { InvitationEntity } from '@base/features/invitation/domain/entities/invitation.entity.ts';
import type { IInvitationServiceClient } from '@base/generated/scylla/workspaces/v1/invitation_service.client.ts';
import type { Invitation } from '@base/generated/scylla/workspaces/v1/invitation_service.ts';
import { idValue, required, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

const PAGE_SIZE = 100;

export const toDomain = (invitation: Invitation): InvitationEntity => ({
  id: idValue(invitation.id),
  workspaceId: idValue(invitation.workspaceId),
  email: invitation.email,
  role: invitation.role,
  invitedBy: idValue(invitation.invitedBy),
  expiresAt: timestampToIso(invitation.expiresAt),
  sentAt: timestampToIso(invitation.sentAt),
});

const requireInvitation = (invitation: Invitation | undefined): InvitationEntity =>
  toDomain(required(invitation, 'invitation'));

export class DefaultInvitationRepository implements InvitationRepository {
  constructor(private readonly client: IInvitationServiceClient) {}

  public async create(workspaceId: string, email: string, role: string) {
    const response = await this.client.createInvitation({
      workspaceId: wrapId(workspaceId),
      email,
      role,
    }).response;
    return requireInvitation(response.invitation);
  }

  public async list(workspaceId: string): Promise<InvitationEntity[]> {
    const invitations: Invitation[] = [];
    let token = '';
    do {
      const response = await this.client.listInvitations({
        workspaceId: wrapId(workspaceId),
        page: { size: PAGE_SIZE, token },
      }).response;
      invitations.push(...response.invitations);
      token = response.page?.nextToken ?? '';
    } while (token);
    return invitations.map(toDomain);
  }

  public async revoke(workspaceId: string, invitationId: string): Promise<void> {
    await this.client.revokeInvitation({
      workspaceId: wrapId(workspaceId),
      invitationId: wrapId(invitationId),
    }).response;
  }

  public async resend(workspaceId: string, invitationId: string) {
    const response = await this.client.resendInvitation({
      workspaceId: wrapId(workspaceId),
      invitationId: wrapId(invitationId),
    }).response;
    return requireInvitation(response.invitation);
  }

  public async accept(token: string): Promise<string> {
    const response = await this.client.acceptInvitation({ token }).response;
    return idValue(response.workspaceId);
  }
}
