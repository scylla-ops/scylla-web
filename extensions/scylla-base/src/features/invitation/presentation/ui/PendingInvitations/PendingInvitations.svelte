<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { can, Permission } from '@platform/authz';
  import { ListSkeleton, enter, fold, reflow, unfold } from '@scylla/ui';
  import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { accessQueries, roleLabel, workspaceRef } from '@base/features/access';
  import { identityKindOf, IdentityAvatar } from '@shared/presentation/ui';
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

  const invitations = createQuery(() => invitationQueries.list(workspaceId));
  // The page of the members reads the same list: the inviter of each row comes from its cache,
  // with no second read when this card mounts.
  const members = createQuery(() => ({
    ...accessQueries.members(workspaceRef(workspaceId), { enabled: canManage }),
    refetchOnMount: false,
  }));
  const inviterOf = (actorId: string) => {
    const member = members.data?.find(item => item.actorId === actorId);
    if (!member) return undefined;
    return {
      name: member.displayName,
      kind: identityKindOf(member),
      profile: {
        displayName: member.displayName,
        username: member.handle,
        avatarUrl: member.avatarUrl,
        avatarColor: member.avatarColor,
        avatarGlyph: member.avatarGlyph,
      },
    };
  };
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
      {#if invitations.isPending}
        <ListSkeleton rows={2} rowClass="h-10 w-full" />
      {:else if (invitations.data ?? []).length === 0}
        <p class="text-sm text-muted-foreground" in:enter>{t(invitationMessages.noPending)}</p>
      {:else}
        <ul class="flex flex-col divide-y" aria-label={t(invitationMessages.pending)}>
          {#each invitations.data ?? [] as invitation (invitation.id)}
            {@const inviter = inviterOf(invitation.invitedBy)}
            <li class="flex items-center gap-3 py-2" in:unfold out:fold animate:reflow>
              <!-- Who sent it, as in the list of the members. A member that left: no avatar. -->
              <span data-part="inviter" class="flex size-6 shrink-0 items-center justify-center">
                {#if inviter}
                  <span class="flex" title={t(invitationMessages.invitedBy(inviter.name))} in:enter>
                    <IdentityAvatar profile={inviter.profile} kind={inviter.kind} size={24} />
                  </span>
                {/if}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{invitation.email}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {roleLabel(invitation.role)} · {t(
                    invitationMessages.expires(formatDate(invitation.expiresAt)),
                  )}{#if inviter}
                    · {t(invitationMessages.invitedBy(inviter.name))}{/if}
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
                variant="ghost-destructive"
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
