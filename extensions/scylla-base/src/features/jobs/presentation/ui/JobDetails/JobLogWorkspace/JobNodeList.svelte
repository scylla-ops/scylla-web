<script lang="ts">
  import ListIcon from '@lucide/svelte/icons/list';
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import { SegmentedControl } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { jobLogMessages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';
  import type { LogDisplay } from '@base/features/jobs/presentation/ui/jobs-log/log-display-settings.state.svelte.ts';
  import JobGraph from '../JobGraph/JobGraph.svelte';
  import JobNodeRow from './JobNodeRow.svelte';
  import type { NodeItem } from './job-log-workspace.state.svelte.ts';

  interface Props {
    job: JobEntity;
    /** The whole job first, then its steps. */
    items: NodeItem[];
    selectedId: string | null;
    errorCount: (nodeId: string | null) => number;
    onSelect: (nodeId: string | null) => void;
    display: LogDisplay;
    /** The rail of the full screen: the rows only. */
    compact?: boolean;
  }

  let { job, items, selectedId, errorCount, onSelect, display, compact = false }: Props = $props();

  // A job from before the snapshot of the nodes has no graph.
  const showGraph = $derived(!compact && job.nodes.length > 0 && display.current.nodeView === 'graph');
  const [whole, ...steps] = $derived(items);

  const views = $derived([
    { value: 'list' as const, label: t(jobLogMessages.list), icon: ListIcon },
    { value: 'graph' as const, label: t(jobLogMessages.graph), icon: WorkflowIcon },
  ]);
</script>

{#snippet row(item: NodeItem)}
  <JobNodeRow
    name={item.name}
    state={item.state}
    extras={item.extras}
    errorCount={errorCount(item.id)}
    duration={item.duration}
    bar={item.bar}
    selected={item.id === selectedId}
    {compact}
    onSelect={() => onSelect(item.id)}
  />
{/snippet}

<!-- The nodes of the job beside its log: a list with the timeline, or the graph of the job. -->
<div class="flex h-full min-h-0 flex-col gap-2">
  <div class="flex h-8 shrink-0 items-center justify-between gap-2 px-1">
    <h2 class="truncate text-sm text-foreground">{t(jobLogMessages.nodes)}</h2>
    {#if !compact && job.nodes.length > 0}
      <SegmentedControl
        size="sm"
        aria-label={t(jobLogMessages.nodesView)}
        value={display.current.nodeView}
        options={views}
        onChange={nodeView => display.set({ nodeView })}
      />
    {/if}
  </div>

  {#if showGraph}
    <!-- The whole job has no node in the graph: its row stays above it. -->
    <div class="-m-1 shrink-0 p-1">{@render row(whole)}</div>
    <JobGraph {job} {selectedId} onSelectNode={onSelect} class="min-h-0 flex-1" />
  {:else}
    <nav
      aria-label={t(jobsMessages.nodeExecutions)}
      class="relative -m-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1"
    >
      {@render row(whole)}
      <span aria-hidden="true" class="mx-2 my-1 h-px shrink-0 bg-border"></span>
      {#each steps as item (item.id)}
        {@render row(item)}
      {/each}
    </nav>
  {/if}
</div>
