<script lang="ts">
  import type { Snippet } from 'svelte';
  import WebhookIcon from '@lucide/svelte/icons/webhook';
  import { ChartDot, ChartLegendItem, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { contextStore } from '@platform/context';
  import { toRune } from '@scylla/ui/stores';
  import { ProviderMark } from '@shared/presentation/ui';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { integrationsUrl } from '@base/features/integrations';
  import { webhookMessages as messages } from '@base/features/dashboard/presentation/messages/webhooks.messages.ts';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { clockIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { viewPermissionName } from '@base/features/dashboard/presentation/presenters/permission-name.presenter.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    timeZone?: string;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, size = 'm', timeZone = 'UTC', editing }: Props = $props();

  const ROWS: Readonly<Record<WidgetSize, number>> = { xs: 0, s: 3, m: 3, l: 3 };

  const context = toRune(contextStore);
  const stats = $derived(widgets.deliveries.data);

  interface Row {
    id: string;
    kind: string;
    name: string;
    detail: string;
    delivered: number;
    failed: number;
  }

  const rows = $derived<Row[]>([
    ...(stats?.connections ?? []).map(item => ({
      id: item.id,
      kind: item.provider || 'webhook',
      name: item.provider === 'github' ? 'GitHub' : item.provider === 'gitlab' ? 'GitLab' : item.id.slice(-8),
      detail: item.account ? t(messages.repositories(item.account, item.repositoryCount)) : '',
      delivered: item.delivered,
      failed: item.failed,
    })),
    ...(stats?.triggers ?? []).map(item => ({
      id: item.id,
      kind: 'webhook',
      name: item.name,
      detail: t(messages.webhookTrigger(item.pipelineName)),
      delivered: item.delivered,
      failed: item.failed,
    })),
  ]);
  const shown = $derived(rows.slice(0, ROWS[size]));
  const most = $derived(Math.max(1, ...rows.map(row => row.delivered + row.failed)));
  const last = $derived(
    [...(stats?.connections ?? []), ...(stats?.triggers ?? [])]
      .filter(item => item.lastReceivedAt)
      .sort((a, b) => b.lastReceivedAt.localeCompare(a.lastReceivedAt))[0],
  );
  const highest = $derived(Math.max(1, ...(stats?.hours ?? []).map(hour => hour.delivered + hour.failed)));
  const hourLabels = $derived.by(() => {
    const hours = stats?.hours ?? [];
    if (hours.length < 2) return [];
    const step = Math.floor((hours.length - 1) / 4);
    return [0, step, step * 2, step * 3].map(index => clockIn(new Date(hours[index].start), timeZone)).concat(t(widgetMessages.now));
  });
  const lastLine = $derived(
    !last
      ? ''
      : last.lastEvent && last.lastRepository
        ? t(messages.lastDelivery(getRelativeTime(last.lastReceivedAt), last.lastEvent, [last.lastRepository, last.lastRef.replace('refs/heads/', '')].filter(Boolean).join('/')))
        : t(messages.lastDeliveryShort(getRelativeTime(last.lastReceivedAt))),
  );
</script>

{#snippet mark(row: Row)}
  {#if row.kind === 'webhook'}
    <WebhookIcon aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
  {:else}
    <ProviderMark kind={row.kind} />
  {/if}
{/snippet}

{#snippet lastDelivery()}
  {#if lastLine}
    <p class="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <ChartDot tone="passed" />
      <span class="truncate">{lastLine}</span>
    </p>
  {/if}
{/snippet}

{#snippet table()}
  <ul class="flex flex-col gap-2">
    {#each shown as row (row.id)}
      <li class="flex h-5 min-w-0 items-center gap-2">
        {@render mark(row)}
        <span class="shrink-0 text-sm font-medium">{row.name}</span>
        <span class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{row.detail}</span>
        <span class="flex h-1 w-[120px] shrink-0 gap-0.5" aria-hidden="true">
          <ChartSegment tone="passed" class="h-full rounded-full" style="width: {(row.delivered / most) * 100}%" />
          {#if row.failed > 0}
            <ChartSegment tone="failed" class="h-full rounded-full" style="width: {Math.max(4, (row.failed / most) * 100)}%" />
          {/if}
        </span>
        <span class="w-12 shrink-0 text-right text-xs font-medium tabular-nums">{row.delivered.toLocaleString()}</span>
        <span class={cn('w-16 shrink-0 text-right text-xs tabular-nums', row.failed > 0 ? 'text-status-failed' : 'text-muted-foreground')}>
          {t(messages.failedCount(row.failed))}
        </span>
      </li>
    {/each}
  </ul>
{/snippet}

{#snippet aside()}
  {#if stats && stats.failed > 0}
    <span class="font-medium text-status-failed">{t(messages.failedCount(stats.failed))}</span>
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  title={t(messages.title)}
  icon={WebhookIcon as LucideIcon}
  meta={size === 'xs' ? undefined : t(messages.hours24)}
  {aside}
>
  <WidgetBody
    {size}
    retrySeconds={60}
    permission={viewPermissionName('integrations')}
    locked={widgets.deliveriesLocked}
    loading={widgets.deliveries.isPending && !widgets.deliveriesLocked}
    error={widgets.deliveries.isError && !widgets.deliveriesLocked}
    onRetry={() => void widgets.deliveries.refetch()}
    empty={!!stats && rows.length === 0}
    emptyTitle={t(messages.nothing)}
    emptyText={t(messages.nothingText)}
  >
    {#if stats}
      {#if size === 'xs'}
        <p data-part="webhooks" class="flex h-7 items-center gap-1.5">
          <span class="font-display text-xl font-medium tabular-nums">{stats.delivered.toLocaleString()}</span>
          <span class="truncate text-xs text-muted-foreground">{t(messages.deliveredIn24h)}</span>
        </p>
      {:else if size === 's'}
        <div data-part="webhooks" class="flex min-h-0 flex-1 flex-col gap-2">
          <p class="flex items-baseline gap-1.5">
            <span class="font-display text-[34px] leading-10 font-medium tabular-nums">{stats.delivered.toLocaleString()}</span>
            <span class="text-xs text-muted-foreground">{t(messages.delivered)}</span>
          </p>
          <ul class="flex flex-col gap-2">
            {#each shown as row (row.id)}
              <li class="flex h-5 min-w-0 items-center gap-2">
                {@render mark(row)}
                <span class="truncate text-sm font-medium">{row.name}</span>
                <span class={cn('ml-auto shrink-0 text-xs font-medium tabular-nums', row.failed > 0 && 'text-status-failed')}>
                  {row.delivered.toLocaleString()}
                </span>
              </li>
            {/each}
          </ul>
          <div class="mt-auto">{@render lastDelivery()}</div>
        </div>
      {:else if size === 'm'}
        <div data-part="webhooks" class="flex min-h-0 flex-1 flex-col">
          {@render table()}
          <div class="mt-auto">{@render lastDelivery()}</div>
        </div>
      {:else}
        <div data-part="webhooks" class="flex min-h-0 flex-1 flex-col gap-4">
          <dl class="flex gap-10">
            <div class="flex flex-col">
              <dd class="font-display text-[34px] leading-10 font-medium tabular-nums">{stats.delivered.toLocaleString()}</dd>
              <dt class="text-xs text-muted-foreground">{t(messages.deliveredIn24h)}</dt>
            </div>
            <div class="flex flex-col">
              <dd class={cn('font-display text-[34px] leading-10 font-medium tabular-nums', stats.failed > 0 && 'text-status-failed')}>{stats.failed}</dd>
              <dt class="text-xs text-muted-foreground">{t(messages.failed)}</dt>
            </div>
          </dl>
          {@render table()}
          {#if stats.hours.length > 0}
            <div class="flex flex-col gap-1.5">
              <p class="flex items-center gap-3 text-xs text-muted-foreground">
                <span class="mr-auto">{t(messages.perHour)}</span>
                <ChartLegendItem tone="passed" label={t(messages.delivered)} />
                <ChartLegendItem tone="failed" label={t(messages.failed)} />
              </p>
              <div class="flex h-[72px] items-end gap-1" role="img" aria-label={t(messages.perHour)}>
                {#each stats.hours as hour (hour.start)}
                  <div class="flex h-full min-w-0 flex-1 flex-col-reverse gap-px">
                    {#if hour.delivered > 0}<ChartSegment tone="passed" class="rounded-[2px]" style="height: {(hour.delivered / highest) * 100}%" />{/if}
                    {#if hour.failed > 0}<ChartSegment tone="failed" class="rounded-[2px]" style="height: {Math.max(4, (hour.failed / highest) * 100)}%" />{/if}
                    {#if hour.delivered + hour.failed === 0}<ChartSegment tone="muted" class="h-[3px] rounded-[2px]" />{/if}
                  </div>
                {/each}
              </div>
              {#if hourLabels.length}
                <div class="flex justify-between text-xs text-muted-foreground tabular-nums">
                  {#each hourLabels as label, index (index)}<span>{label}</span>{/each}
                </div>
              {/if}
            </div>
          {/if}
          <div class="mt-auto flex items-center gap-2">
            {@render lastDelivery()}
            <a class="ml-auto shrink-0 text-xs font-medium text-primary hover:underline" href={integrationsUrl(context().workspace.slug ?? "")}>{t(messages.manage)}</a>
          </div>
        </div>
      {/if}
    {/if}
  </WidgetBody>
</Widget>
