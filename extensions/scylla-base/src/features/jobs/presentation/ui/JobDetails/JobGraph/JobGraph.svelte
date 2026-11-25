<script lang="ts">
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobGraph } from '@base/features/jobs/presentation/presenters/job-graph.presenter.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { setJobGraph } from './job-graph.context.ts';
  import JobGraphView from './JobGraphView.svelte';

  interface Props {
    job: JobEntity;
    /** The node of the log: its node has a ring. */
    selectedId: string | null;
    /** A click on a node: the page opens its log. */
    onSelectNode: (nodeId: string) => void;
    class?: string;
  }

  let { job, selectedId, onSelectNode, class: className }: Props = $props();

  setJobGraph({
    select: nodeId => onSelectNode(nodeId),
    isSelected: nodeId => nodeId === selectedId,
  });

  // The same query as the list: each poll draws the job again.
  const graph = $derived(jobGraph(job));
</script>

<!-- The graph of the job, read-only: the path that it took. A click on a node opens its log. -->
<section
  aria-label={t(jobsMessages.jobGraph)}
  class={cn('overflow-hidden rounded-xl border border-border bg-card', className)}
>
  <!-- The provider lets the view fit the graph again at a resize. -->
  <SvelteFlowProvider>
    <JobGraphView nodes={graph.nodes} edges={graph.edges} />
  </SvelteFlowProvider>
</section>
