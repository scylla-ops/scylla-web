<script lang="ts">
  import { Card, Skeleton } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { getStatusIcon } from '@shared/presentation/ui';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import type { RecentJobRow } from './agent-details.state.svelte.ts';
  import {
    formatDurationMs,
    shortId,
  } from '@base/features/agents/presentation/presenters/agent-format.presenter.ts';
  import { agentDetailsMessages as messages } from '@base/features/agents/presentation/messages/agent-details.messages.ts';

  interface Props {
    rows: RecentJobRow[];
    loading: boolean;
    now: number;
    canOpen: (row: RecentJobRow) => boolean;
    onOpen: (row: RecentJobRow) => void;
  }

  let { rows, loading, now, canOpen, onOpen }: Props = $props();

  const when = (iso: string) => {
    void now;
    return getRelativeTime(iso);
  };
</script>

<Card class="gap-0 overflow-hidden py-0">
  <div class="flex flex-col gap-1 border-b px-5 py-4">
    <h2 class="text-sm font-semibold">{t(messages.recentJobs)}</h2>
    <p class="text-xs text-muted-foreground">{t(messages.lastJobsOfAgent)}</p>
  </div>

  {#if loading}
    <div class="flex flex-col gap-2 p-5">
      {#each { length: 3 } as _, index (index)}
        <Skeleton class="h-6 w-full" />
      {/each}
    </div>
  {:else if rows.length === 0}
    <p class="px-5 py-8 text-center text-sm text-muted-foreground">{t(messages.noJobYet)}</p>
  {:else}
    <ul class="divide-y">
      {#each rows as row (row.job.id)}
        {@const config = getStatusConfig(row.job.status)}
        {@const Icon = getStatusIcon(row.job.status)}
        {@const openable = canOpen(row)}
        {@const pipeline = row.pipelineName || shortId(row.job.pipelineId)}
        {@const time = when(row.job.createdAt)}
        <li>
          <button
            type="button"
            disabled={!openable}
            onclick={() => onOpen(row)}
            aria-label={row.projectName
              ? t(messages.jobRowInProject(row.projectName, pipeline, t(config.label), time))
              : t(messages.jobRow(pipeline, t(config.label), time))}
            class="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left text-sm transition-colors enabled:hover:bg-muted/40 disabled:cursor-default sm:grid-cols-[auto_minmax(0,1fr)_7rem_6rem_7rem]"
          >
            <Icon class={cn('size-4', config.iconClassName)} />
            <span class="flex min-w-0 items-baseline gap-1.5">
              {#if row.projectName}
                <span class="truncate text-muted-foreground">{row.projectName}</span>
                <span class="text-muted-foreground" aria-hidden="true">/</span>
              {/if}
              <span class="truncate font-medium">{pipeline}</span>
              <span class="shrink-0 font-mono text-xs text-muted-foreground"
                >{shortId(row.job.id)}</span
              >
            </span>
            <span class={cn('hidden sm:block', config.textClassName)}>{t(config.label)}</span>
            <span class="hidden text-muted-foreground tabular-nums sm:block">
              {row.durationMs === null ? '' : formatDurationMs(row.durationMs)}
            </span>
            <span class="text-right text-muted-foreground">{time}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</Card>
