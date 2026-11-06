<script lang="ts">
  import BellIcon from '@lucide/svelte/icons/bell';
  import { createQuery } from '@scylla/core-sdk';
  import { Button, Popover, PopoverContent, PopoverTrigger } from '@scylla/ui/primitives';
  import {
    badgeText,
    bellLabel,
    loadNotificationsPanel,
    notificationQueries,
  } from '@base/features/notifications';

  let open = $state(false);

  const summary = createQuery(() => notificationQueries.summary());
  const unread = $derived(summary.data?.unread ?? 0);
  const badge = $derived(badgeText(unread));
  const label = $derived(bellLabel(unread));
</script>

<Popover bind:open>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        size="icon"
        class="relative size-8 shrink-0 rounded-lg data-[state=open]:bg-accent"
        aria-label={label}
      >
        <BellIcon class="size-4" aria-hidden="true" />
        {#if badge}
          <span
            data-testid="notifications-badge"
            class="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
            aria-hidden="true"
          >
            {badge}
          </span>
        {/if}
      </Button>
    {/snippet}
  </PopoverTrigger>
  <PopoverContent
    class="w-[26rem] max-w-[calc(100vw-2rem)] p-0"
    side="bottom"
    align="end"
    sideOffset={4}
    collisionPadding={16}
  >
    {#await loadNotificationsPanel() then { default: NotificationsPanel }}
      <NotificationsPanel onNavigate={() => (open = false)} />
    {/await}
  </PopoverContent>
</Popover>
<span class="sr-only" aria-live="polite">{label}</span>
