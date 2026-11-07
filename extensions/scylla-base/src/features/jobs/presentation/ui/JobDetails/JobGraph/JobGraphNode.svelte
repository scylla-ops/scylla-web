<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { getStatusIcon } from '@shared/presentation/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import {
    JOB_NODE,
    type JobFlowNode,
  } from '@base/features/jobs/presentation/presenters/job-graph.presenter.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { getJobGraph } from './job-graph.context.ts';

  let { id, data }: NodeProps<JobFlowNode> = $props();

  const graph = getJobGraph();
  const state = $derived(data.execution?.state ?? 'pending');
  const config = $derived(getStatusConfig(state));
  const Icon = $derived(getStatusIcon(state));
  const notTaken = $derived(data.reason === 'not-taken');
  const ports = $derived(data.outputs.filter(output => output.port));
  const handle = 'size-2! border-[1.5px]! border-muted-foreground/60! bg-card!';

  /** A plain output in the middle of the head, a port in the middle of its row. */
  const topOf = (row: number) =>
    row < 0 ? JOB_NODE.height / 2 : JOB_NODE.height + (row + 0.5) * JOB_NODE.portRow;
</script>

<!--
  A node in the colour of its state, as the list shows it; grey and dashed when the path did not
  reach it. Each named port is a row with its handle on the right; a chosen port is filled. The
  node is a button that opens the logs; the handles stay outside it.
-->
<div
  class={cn(
    'rounded-lg border shadow-xs',
    notTaken
      ? 'border-dashed border-muted-foreground/50 bg-muted text-muted-foreground'
      : config.badgeClassName,
  )}
  style="width: {JOB_NODE.width}px;"
>
  <Handle type="target" position={Position.Left} isConnectable={false} class={handle} />
  <button
    type="button"
    aria-label={t(jobsMessages.openLogsOf(id))}
    class="nodrag nopan flex w-full cursor-pointer flex-col rounded-lg text-left"
    onclick={() => graph.select(id)}
  >
    <span class="flex items-center gap-2 px-2.5" style="height: {JOB_NODE.height}px;">
      <Icon
        class={cn('size-4 shrink-0', notTaken ? 'text-muted-foreground' : config.iconClassName)}
      />
      <span class="min-w-0 flex-1 truncate font-mono text-[12.5px] font-medium text-foreground">
        {id}
      </span>
      <span class="shrink-0 text-[10.5px]">
        {notTaken ? t(jobsMessages.notTaken) : t(config.label)}
      </span>
    </span>
    {#each ports as output (output.port)}
      <span
        class={cn(
          'flex items-center justify-end pr-2.5 font-mono text-[10.5px]',
          output.error && 'text-destructive',
          !output.error && (output.chosen ? 'font-semibold text-foreground' : 'text-muted-foreground'),
        )}
        style="height: {JOB_NODE.portRow}px;"
      >
        {output.port}
      </span>
    {/each}
  </button>
  {#each data.outputs as output (output.port ?? '')}
    <Handle
      type="source"
      id={output.port}
      position={Position.Right}
      isConnectable={false}
      class={cn(
        handle,
        output.error && 'border-destructive! bg-destructive!',
        output.chosen && 'border-foreground! bg-foreground!',
      )}
      style="top: {topOf(output.port ? ports.indexOf(output) : -1)}px;"
    />
  {/each}
</div>
