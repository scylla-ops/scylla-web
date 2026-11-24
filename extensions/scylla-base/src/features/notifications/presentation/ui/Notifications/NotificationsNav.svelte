<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';
  import {
    NOTIFICATION_VIEWS,
    notificationViewHref,
    type NotificationViewId,
  } from './notification-views.registry.ts';

  let { current }: { current: NotificationViewId } = $props();

  // The failed runs are those of a workspace, and this mount has none.
  const views = NOTIFICATION_VIEWS.filter(view => view.filter);
</script>

<nav aria-label={t(messages.title)} class="md:w-55 md:shrink-0">
  <ul class="flex flex-wrap gap-1 md:flex-col">
    {#each views as view (view.id)}
      <li>
        {#if view.heading}
          <p class="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase max-md:hidden">
            {t(view.heading)}
          </p>
        {/if}
        <a
          href={notificationViewHref(null, view.id)}
          aria-current={view.id === current ? 'page' : undefined}
          class={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-muted',
            view.id === current && 'bg-muted font-medium',
          )}
        >
          <view.icon class="size-4 shrink-0" />
          {t(view.title)}
        </a>
      </li>
    {/each}
  </ul>
</nav>
