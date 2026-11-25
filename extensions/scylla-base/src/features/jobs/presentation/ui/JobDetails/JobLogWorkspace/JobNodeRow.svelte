<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import { StatusShape } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { formatDuration } from '@shared/utils/date-utils.ts';
  import { toStatusState } from '@shared/utils/job-status.utils.ts';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import type { TimelineBar } from '@base/features/jobs/presentation/presenters/job-node-rows.presenter.ts';
  import { jobLogMessages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';

  interface Props {
    name: string;
    /** The state of the node, or of the job for the whole job. */
    state: string;
    /** Small texts after the name: built in, the attempt, the ports of a switch. */
    extras?: string[];
    errorCount: number;
    /** In seconds. */
    duration: number | null;
    /** `null`: no bar (the whole job, or a node that did not start). */
    bar: TimelineBar | null;
    selected: boolean;
    /** The rail of the full screen: no bar and no extra. */
    compact?: boolean;
    onSelect: () => void;
  }

  let {
    name,
    state,
    extras = [],
    errorCount,
    duration,
    bar,
    selected,
    compact = false,
    onSelect,
  }: Props = $props();

  const config = $derived(getStatusConfig(state));
</script>

<!--
  A node of the job: its status, its name, its errors and its duration, then its place on the
  timeline of the job. The status is centered on the whole row.
-->
<button
  type="button"
  aria-pressed={selected}
  onclick={onSelect}
  class={cn(
    'grid w-full shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
    selected && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
  )}
>
  <span class={cn('flex items-center justify-center', bar && !compact && 'row-span-2')}>
    <StatusShape state={toStatusState(state)} label={t(config.label)} size={18} />
  </span>
  <span class="flex min-w-0 items-center gap-1.5">
    <span class="truncate text-sm font-medium">{name}</span>
    {#if !compact}
      {#each extras as extra (extra)}
        <span class="shrink-0 font-mono text-[11px] text-muted-foreground">{extra}</span>
      {/each}
    {/if}
  </span>
  <span class="flex items-center justify-end gap-2 text-xs text-muted-foreground">
    {#if errorCount > 0}
      <span
        class="flex h-5 items-center justify-center gap-1 rounded-full bg-destructive-subtle px-1.5 font-medium text-destructive tabular-nums"
      >
        <CircleAlertIcon class="size-3 shrink-0" aria-hidden="true" />
        <span aria-hidden="true">{errorCount}</span>
        <span class="sr-only">{t(jobLogMessages.errorCount(errorCount))}</span>
      </span>
    {/if}
    {#if !compact}
      <span class="tabular-nums">{duration === null ? '-' : formatDuration(duration)}</span>
    {/if}
  </span>
  {#if bar && !compact}
    <span class="relative col-span-2 col-start-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <span
        class={cn('absolute inset-y-0 min-w-0.5 rounded-full', config.barClassName)}
        style="left: {bar.start}%; width: {bar.width}%"
      ></span>
    </span>
  {/if}
</button>
