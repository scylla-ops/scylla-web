<script lang="ts">
  import PlayIcon from '@lucide/svelte/icons/play';
  import { scyllaHref } from '@platform/context';
  import { IconButton, StatusShape } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    formatCoarseDuration,
    formatUpcomingTime,
    getRelativeTime,
  } from '@shared/utils/date-utils.ts';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import type { CardPipelineRow } from '../../presenters/project-card.presenter.ts';
  import { projectCardMessages } from '../../messages/project-card.messages.ts';
  import { pipelineMessages } from '../../messages/pipeline.messages.ts';
  import { runMessages } from '../../messages/run.messages.ts';

  interface Props {
    row: CardPipelineRow;
    projectId: string;
    now: number;
    /** Absent: the reader may not run the pipeline. */
    onRun?: () => void;
    running: boolean;
    onOpen: () => void;
  }

  let { row, projectId, now, onRun, running, onOpen }: Props = $props();

  const statusLabel = $derived(
    t(row.status ? getStatusConfig(row.status).label : pipelineMessages.noRunYet),
  );

  const time = $derived.by(() => {
    switch (row.time?.kind) {
      case 'running':
        return t(
          projectCardMessages.runningFor(
            formatCoarseDuration((now - Date.parse(row.time.since)) / 1000),
          ),
        );
      case 'next':
        return t(projectCardMessages.nextAt(formatUpcomingTime(row.time.at, now)));
      case 'last':
        return getRelativeTime(row.time.at, now);
      default:
        return '';
    }
  });
</script>

<!-- The whole row opens the jobs of the pipeline; its button runs the pipeline. -->
<div
  class="relative flex h-9 items-center gap-2 rounded-md pr-1 pl-2 transition-colors hover:bg-muted max-md:h-11"
  data-part="project-pipeline"
  data-pipeline-id={row.id}
>
  <StatusShape state={row.state} label={statusLabel} size={20} />
  <a
    href={scyllaHref.jobs(projectId, row.id)}
    onclick={onOpen}
    aria-label={t(projectCardMessages.openJobs(row.name))}
    class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring"
  >
    <span class="shrink-0 truncate text-sm font-medium text-foreground">{row.name}</span>
    {#if row.branch}
      <span class="min-w-0 truncate font-mono text-xs text-muted-foreground">{row.branch}</span>
    {/if}
  </a>
  {#if time}
    <span class="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{time}</span>
  {/if}
  {#if onRun}
    <IconButton
      icon={PlayIcon}
      tooltip={t(runMessages.titleUnnamed)}
      busy={running}
      onclick={event => {
        event.stopPropagation();
        onRun();
      }}
      class="relative size-8 shrink-0 max-md:size-11"
      iconClass="size-4"
    />
  {/if}
</div>
