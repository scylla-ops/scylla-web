<script lang="ts">
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobGraph } from '@base/features/jobs/presentation/presenters/job-graph.presenter.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { setJobGraph } from './job-graph.context.ts';
  import JobGraphView from './JobGraphView.svelte';

  interface Props {
    job: JobEntity;
    /** A click on a node: the page opens its logs in the list. */
    onSelectNode: (nodeId: string) => void;
  }

  let { job, onSelectNode }: Props = $props();

  setJobGraph({ select: nodeId => onSelectNode(nodeId) });

  // The same query as the list: each poll draws the job again.
  const graph = $derived(jobGraph(job));
</script>

<!-- The graph of the job, read-only: the path that it took, above the list of its nodes. -->
<section
  aria-label={t(jobsMessages.jobGraph)}
  class="h-56 shrink-0 overflow-hidden rounded-xl border border-border bg-card"
>
  <!-- The provider lets the view fit the graph again at a resize. -->
  <SvelteFlowProvider>
    <JobGraphView nodes={graph.nodes} edges={graph.edges} />
  </SvelteFlowProvider>
</section>
