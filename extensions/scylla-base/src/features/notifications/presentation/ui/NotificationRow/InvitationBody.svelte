<script lang="ts">
  import { roleLabel } from '@base/features/access';
  import { navigateTo, workspaceUrl } from '@platform/context';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { formatDate } from '@shared/utils/date-utils.ts';
  import type {
    NotificationEntity,
    NotificationInvitation,
  } from '../../../domain/entities/notification.entity.ts';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';
  import { InvitationBodyState } from './invitation-body.state.svelte.ts';

  interface Props {
    row: NotificationEntity;
    invitation: NotificationInvitation;
    slug: string | null;
    onNavigate?: () => void;
  }

  let { row, invitation, slug, onNavigate }: Props = $props();

  const body = new InvitationBodyState(() => onNavigate?.());

  const actor = $derived(row.actorName || t(messages.someone));
  const workspace = $derived(row.workspaceName || t(messages.aWorkspace));
  const role = $derived(roleLabel(invitation.role));
  const working = $derived(body.accepting || body.declining);

  const go = (href: string) => {
    navigateTo(href);
    onNavigate?.();
  };
</script>

{#if body.refusal === 'other-email'}
  <p class="text-sm">{t(messages.invitationOtherEmail)}</p>
  <Button
    variant="outline"
    size="sm"
    class="mt-1.5"
    onclick={() => go(slug ? workspaceUrl(slug, 'account/profile') : '/account/profile')}
  >
    {t(messages.openAccount)}
  </Button>
{:else if body.refusal === 'gone'}
  <p class="text-sm text-muted-foreground">{t(messages.invitationGone)}</p>
{:else if invitation.state.kind === 'accepted'}
  <p class="text-sm">{t(messages.invitationJoined(workspace, role))}</p>
  {#if row.workspaceSlug}
    <Button
      variant="outline"
      size="sm"
      class="mt-1.5"
      onclick={() => go(workspaceUrl(row.workspaceSlug))}
    >
      {t(messages.openWorkspace(workspace))}
    </Button>
  {/if}
{:else if invitation.state.kind === 'expired'}
  <p class="text-sm text-muted-foreground">{t(messages.invitationEnded(workspace, actor))}</p>
{:else}
  <p class="text-sm">{t(messages.invitationReceived(actor, workspace, role))}</p>
  <p class="text-xs text-muted-foreground">
    {t(messages.invitationEnds(formatDate(invitation.state.expiresAt)))}
  </p>
  <div class="mt-1.5 flex flex-wrap gap-2">
    <Button size="sm" disabled={working} onclick={() => body.accept(invitation.id)}>
      {t(body.accepting ? messages.accepting : messages.accept)}
    </Button>
    <Button
      variant="outline"
      size="sm"
      disabled={working}
      onclick={() => body.decline(invitation.id)}
    >
      {t(body.declining ? messages.declining : messages.decline)}
    </Button>
  </div>
{/if}
