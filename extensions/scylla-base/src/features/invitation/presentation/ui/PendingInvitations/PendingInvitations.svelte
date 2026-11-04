<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { can, Permission } from '@platform/authz';
  import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { roleLabel } from '@base/features/access';
  import { formatDate } from '@shared/utils/date-utils.ts';
  import {
    invitationMutations,
    invitationQueries,
  } from '@base/features/invitation/presentation/invitation.queries.ts';
  import { invitationMessages } from '@base/features/invitation/presentation/messages/invitation.messages.ts';

  interface Props {
    workspaceId: string;
  }

  let { workspaceId }: Props = $props();

  /** `list_invitations` needs the same right as a grant: the admins of the workspace. */
  const canManage = $derived(can(Permission.ADD_WORKSPACE_MEMBER, { workspaceId: workspaceId }));

  const invitations = createQuery(() =>
    invitationQueries.list(workspaceId, { enabled: canManage }),
  );
  const resend = createMutation(() => invitationMutations.resend());
  const revoke = createMutation(() => invitationMutations.revoke());
</script>

{#if canManage}
  <Card>
    <CardHeader>
      <CardTitle><h2>{t(invitationMessages.pending)}</h2></CardTitle>
      <CardDescription>{t(invitationMessages.pendingDescription)}</CardDescription>
    </CardHeader>
    <CardContent>
      {#if (invitations.data ?? []).length === 0}
        <p class="text-sm text-muted-foreground">{t(invitationMessages.noPending)}</p>
      {:else}
        <ul class="flex flex-col divide-y" aria-label={t(invitationMessages.pending)}>
          {#each invitations.data ?? [] as invitation (invitation.id)}
            <li class="flex items-center gap-3 py-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{invitation.email}</p>
                <p class="text-xs text-muted-foreground">
                  {roleLabel(invitation.role)} · {t(
                    invitationMessages.expires(formatDate(invitation.expiresAt)),
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={resend.isPending}
                aria-label={`${t(invitationMessages.resend)} ${invitation.email}`}
                onclick={() => resend.mutate({ workspaceId, invitationId: invitation.id })}
              >
                {t(invitationMessages.resend)}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={revoke.isPending}
                aria-label={`${t(invitationMessages.revoke)} ${invitation.email}`}
                onclick={() => revoke.mutate({ workspaceId, invitationId: invitation.id })}
              >
                {t(invitationMessages.revoke)}
              </Button>
            </li>
          {/each}
        </ul>
      {/if}
    </CardContent>
  </Card>
{/if}
