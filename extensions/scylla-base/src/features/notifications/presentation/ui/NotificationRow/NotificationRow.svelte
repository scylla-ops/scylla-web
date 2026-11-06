<script lang="ts">
  import ArchiveRestoreIcon from '@lucide/svelte/icons/archive-restore';
  import CheckIcon from '@lucide/svelte/icons/check';
  import MailIcon from '@lucide/svelte/icons/mail';
  import MailOpenIcon from '@lucide/svelte/icons/mail-open';
  import { navigateTo } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { Button, Checkbox } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { NotificationEntity } from '../../../domain/entities/notification.entity.ts';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';
  import { notificationMutations } from '../../notifications.queries.ts';
  import { viewOfRow } from '../../presenters/kind-views.ts';
  import InvitationBody from './InvitationBody.svelte';

  interface Props {
    row: NotificationEntity;
    /** The active workspace, or `null` outside a workspace. */
    slug: string | null;
    onNavigate?: () => void;
    /** On the full page: the checkbox of the row. */
    selected?: boolean;
    onToggleSelect?: () => void;
    /** On the full page: the row that the keys act on. */
    active?: boolean;
  }

  let { row, slug, onNavigate, selected = false, onToggleSelect, active = false }: Props = $props();

  const view = $derived(viewOfRow(row, slug));
  const Icon = $derived(view.icon);
  const markRead = createMutation(() => notificationMutations.markRead());
  const setDone = createMutation(() => notificationMutations.setDone());

  const toggleRead = () => markRead.mutate({ ids: [row.id], read: !row.read });
  const toggleDone = () => setDone.mutate({ ids: [row.id], done: !row.done });

  const open = (event: MouseEvent) => {
    if (!view.href) return;
    event.preventDefault();
    if (!row.read && !row.needsAction) markRead.mutate({ ids: [row.id], read: true });
    navigateTo(view.href);
    onNavigate?.();
  };

  const ACTION = 'size-6 text-muted-foreground hover:text-foreground';
</script>

<li
  data-testid="notification-row"
  data-active={active || undefined}
  class={cn(
    'group flex gap-2 rounded-lg px-2 py-2 hover:bg-accent/50',
    active && 'bg-accent/50 ring-1 ring-ring',
  )}
>
  {#if onToggleSelect}
    <Checkbox
      class="mt-0.5"
      checked={selected}
      onCheckedChange={onToggleSelect}
      aria-label={t(messages.select)}
    />
  {/if}
  <span
    class={cn('mt-1.5 size-2 shrink-0 rounded-full', row.read ? 'bg-transparent' : 'bg-primary')}
    aria-hidden="true"
  ></span>
  <Icon class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  <div class="min-w-0 flex-1">
    {#if row.invitation && row.kind === 'invitation.received'}
      <InvitationBody {row} invitation={row.invitation} {slug} {onNavigate} />
    {:else}
      {#if view.href}
        <a href={view.href} onclick={open} class="text-sm underline-offset-4 hover:underline">
          {view.text}
        </a>
      {:else}
        <p class="text-sm">{view.text}</p>
      {/if}
      {#if row.occurrences > 1}
        <span class="text-xs text-muted-foreground">{t(messages.occurrences(row.occurrences))}</span>
      {/if}
      {#if view.detail}
        <p class="text-xs text-muted-foreground">{view.detail}</p>
      {/if}
      {#if view.reason}
        <p class="text-xs text-muted-foreground">{view.reason}</p>
      {/if}
    {/if}
  </div>
  <div class="flex shrink-0 flex-col items-end gap-1">
    <time class="text-xs text-muted-foreground" datetime={row.lastAt}>
      {getRelativeTime(row.lastAt)}
    </time>
    <div class="flex gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
      {#if !row.needsAction}
        <Button
          variant="ghost"
          size="icon"
          class={ACTION}
          aria-label={t(row.read ? messages.markUnread : messages.markRead)}
          title={t(row.read ? messages.markUnread : messages.markRead)}
          onclick={toggleRead}
        >
          {#if row.read}
            <MailIcon class="size-3.5" aria-hidden="true" />
          {:else}
            <MailOpenIcon class="size-3.5" aria-hidden="true" />
          {/if}
        </Button>
      {/if}
      <Button
        variant="ghost"
        size="icon"
        class={ACTION}
        aria-label={t(row.done ? messages.putBack : messages.markDone)}
        title={t(row.done ? messages.putBack : messages.markDone)}
        onclick={toggleDone}
      >
        {#if row.done}
          <ArchiveRestoreIcon class="size-3.5" aria-hidden="true" />
        {:else}
          <CheckIcon class="size-3.5" aria-hidden="true" />
        {/if}
      </Button>
    </div>
  </div>
</li>
