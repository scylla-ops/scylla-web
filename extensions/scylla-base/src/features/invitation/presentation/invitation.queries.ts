import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { can, Permission } from '@platform/authz';
import { toast } from '@scylla/ui/utils';
import type { InvitationModule } from '../invitation.module.ts';
import { invitationMessages } from './messages/invitation.messages.ts';

const repository = () =>
  getModuleDomain<typeof InvitationModule.domain>('invitation').invitationRepository;

export const INVITATIONS_QUERY_KEY = (workspaceId: string) => ['invitations', workspaceId] as const;

export const invitationQueries = {
  /** The open invitations: `list_invitations` is for the managers. */
  list: (workspaceId: string | null) =>
    queryOptions({
      queryKey: INVITATIONS_QUERY_KEY(workspaceId ?? ''),
      queryFn: () => repository().list(workspaceId!),
      enabled: !!workspaceId && can(Permission.ADD_WORKSPACE_MEMBER, { workspaceId }),
    }),
};

const invalidate = (workspaceId: string) =>
  getQueryClient().invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY(workspaceId) });

export interface InviteInput {
  workspaceId: string;
  email: string;
  role: string;
}

export const invitationMutations = {
  create: () =>
    mutationOptions({
      mutationFn: ({ workspaceId, email, role }: InviteInput) =>
        repository().create(workspaceId, email.trim(), role),
      onSuccess: (invitation, { workspaceId }) => {
        toast.success(i18n._(invitationMessages.sent(invitation.email)));
        return invalidate(workspaceId);
      },
    }),

  resend: () =>
    mutationOptions({
      mutationFn: ({ workspaceId, invitationId }: { workspaceId: string; invitationId: string }) =>
        repository().resend(workspaceId, invitationId),
      onSuccess: (invitation, { workspaceId }) => {
        toast.success(i18n._(invitationMessages.sent(invitation.email)));
        return invalidate(workspaceId);
      },
    }),

  revoke: () =>
    mutationOptions({
      mutationFn: ({ workspaceId, invitationId }: { workspaceId: string; invitationId: string }) =>
        repository().revoke(workspaceId, invitationId),
      onSuccess: (_result, { workspaceId }) => {
        toast.success(i18n._(invitationMessages.revoked));
        return invalidate(workspaceId);
      },
    }),
};
