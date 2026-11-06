<script lang="ts">
  import type { JobEntity } from '@base/features/jobs';
  import { scyllaNavigate } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { DataTable } from '@scylla/ui';
  import { createSelection } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import { toStatusState } from '@shared/utils/job-status.utils.ts';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import type { PipelineMetadata } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { pipelineMutations } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import type { RunPipeline } from '@base/features/pipeline/presentation/ui/run-pipeline.state.svelte.ts';
  import PipelineChart from './PipelineChart.svelte';
  import PipelineActions from './PipelineActions.svelte';
  import PipelineLastJob from './PipelineLastJob.svelte';
  import PipelineStatus from './PipelineStatus.svelte';
  import { pipelineColumns } from './pipeline-table.columns.ts';

  interface Props {
    pipelines: PipelineMetadata[];
    jobsByPipelineId: Map<string, JobEntity[]>;
    isJobsLoading?: boolean;
    isJobsError?: boolean;
    canListJobs?: boolean;
    /** Shared with the header: one agent subscription, one set of running ids. */
    runPipeline: RunPipeline;
  }

  let {
    pipelines,
    jobsByPipelineId,
    isJobsLoading = false,
    isJobsError = false,
    canListJobs = true,
    runPipeline,
  }: Props = $props();

  const selection = createSelection('pipelines');
  const duplicatePipeline = createMutation(() => pipelineMutations.duplicate());

  const jobsOf = (pipelineId: string) => jobsByPipelineId.get(pipelineId) ?? [];

  const columns = $derived(
    pipelineColumns({
      status: statusCell,
      history: historyCell,
      lastRun: lastRunCell,
      actions: actionsCell,
    }),
  );
</script>

{#snippet statusCell(pipeline: PipelineMetadata)}
  {@const lastJob = jobsOf(pipeline.id)[0]}
  <PipelineStatus
    {pipeline}
    status={toStatusState(lastJob?.status)}
    statusLabel={lastJob ? t(getStatusConfig(lastJob.status).label) : t(pipelineMessages.noJobsYet)}
  />
{/snippet}

{#snippet historyCell(pipeline: PipelineMetadata)}
  <div
    data-tour="pipeline-history"
    data-pipeline-id={pipeline.id}
    data-pipeline-name={pipeline.name}
    data-last-status={jobsOf(pipeline.id)[0]?.status}
    class="w-full"
  >
    <PipelineChart
      jobs={jobsOf(pipeline.id)}
      isLoading={isJobsLoading}
      isError={isJobsError}
      isForbidden={canListJobs === false}
      maxJobs={5}
      onSelectJob={jobId =>
        scyllaNavigate.goToJobDetails(pipeline.id, jobId, { pipelineName: pipeline.name })}
    />
  </div>
{/snippet}

{#snippet lastRunCell(pipeline: PipelineMetadata)}
  <PipelineLastJob
    jobs={jobsOf(pipeline.id)}
    onSelectJob={jobId =>
      scyllaNavigate.goToJobDetails(pipeline.id, jobId, { pipelineName: pipeline.name })}
  />
{/snippet}

{#snippet actionsCell(pipeline: PipelineMetadata)}
  <div
    data-tour="pipeline-actions"
    data-pipeline-id={pipeline.id}
    data-pipeline-name={pipeline.name}
    class="w-full"
  >
    <PipelineActions
      onRun={event => {
        // The row is a selection target: an action is not a selection.
        event.stopPropagation();
        void runPipeline.run(pipeline.id);
      }}
      onEdit={event => {
        event.stopPropagation();
        scyllaNavigate.goToEditPipeline(pipeline.id, pipeline.name);
      }}
      onDuplicate={event => {
        event.stopPropagation();
        duplicatePipeline.mutate(pipeline.id);
      }}
      onViewJobs={event => {
        event.stopPropagation();
        scyllaNavigate.goToJobs(pipeline.id, pipeline.name);
      }}
      onViewTriggers={event => {
        event.stopPropagation();
        scyllaNavigate.goToTriggers(pipeline.id, pipeline.name);
      }}
      isRunning={runPipeline.isRunning(pipeline.id)}
      isDuplicating={duplicatePipeline.isPending && duplicatePipeline.variables === pipeline.id}
    />
  </div>
{/snippet}

<DataTable
  {columns}
  data={pipelines}
  onRowClick={row => selection.select(row.original.id)}
  getRowId={(pipeline, index) => pipeline.id || String(index)}
  isRowSelected={pipeline => selection.selectedIds.includes(pipeline.id)}
  alignColumnsCenter
  alignRowsCenter
/>
