<script lang="ts">
  import { ChartDot, ChartSegment } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { JobRunMark } from '@shared/presentation/ui';
  import { pipelinesMessages as messages } from '@base/features/dashboard/presentation/messages/pipelines.messages.ts';
  import type { PipelineRow } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import { PIPELINE_RUNS } from '../dashboard-widgets.state.svelte.ts';
  import { openJob, openPipelineJobs } from '../widget-navigation.ts';

  interface Props {
    rows: readonly PipelineRow[];
  }

  let { rows }: Props = $props();

  const dotTone = (row: PipelineRow) => (row.tone === 'running' ? 'warning' : row.tone);
</script>

<table data-part="pipelines-table" class="w-full table-fixed text-left text-xs">
  <thead>
    <tr class="text-muted-foreground">
      <th class="w-4 pb-1.5 font-normal"><span class="sr-only">{t(messages.green)}</span></th>
      <th class="pb-1.5 font-normal">{t(messages.pipeline)}</th>
      <th class="w-[146px] pb-1.5 font-normal">{t(messages.lastRuns(PIPELINE_RUNS))}</th>
      <th class="w-14 pb-1.5 text-right font-normal">{t(messages.success)}</th>
      <th class="w-[60px] pb-1.5 text-right font-normal">{t(messages.median)}</th>
    </tr>
  </thead>
  <tbody>
    {#each rows as row (row.id)}
      <tr class="h-[26px]">
        <td><ChartDot tone={dotTone(row)} /></td>
        <td class="pr-2">
          <button type="button" class="flex w-full min-w-0 items-baseline gap-1.5 text-left hover:underline" onclick={() => openPipelineJobs(row)}>
            <span class="truncate text-sm font-medium">{row.name}</span>
            <span class="truncate text-muted-foreground">{row.projectName} · {row.trigger}</span>
          </button>
        </td>
        <td>
          <span class="flex h-3 gap-0.5" role="group" aria-label={t(messages.lastRuns(PIPELINE_RUNS))}>
            {#each row.runs as mark (mark.jobId)}
              <JobRunMark run={mark.run} duration={mark.seconds} class="h-full w-[5px] rounded-[1px]" onSelect={() => openJob(mark)}>
                <ChartSegment tone={mark.tone} class="size-full rounded-[1px]" />
              </JobRunMark>
            {/each}
          </span>
        </td>
        <td class="text-right font-medium tabular-nums">{row.rate}</td>
        <td class="text-right text-muted-foreground tabular-nums">{row.median}</td>
      </tr>
    {/each}
  </tbody>
</table>
