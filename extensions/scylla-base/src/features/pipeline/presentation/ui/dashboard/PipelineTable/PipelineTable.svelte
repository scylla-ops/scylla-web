<script lang="ts">
  import type { PipelineHistory } from '@base/features/jobs';
  import { scyllaNavigate } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { DataTable } from '@scylla/ui';
  import { createSelection } from '@scylla/ui/state';
  import type { PipelineMetadata } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
  import { originNote } from '@base/features/pipeline/presentation/presenters/pipeline-file.presenter.ts';
  import { pipelineMutations } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import type { RunPipeline } from '@base/features/pipeline/presentation/ui/run-pipeline.state.svelte.ts';
  import type { RunRequest } from '@base/features/pipeline/presentation/ui/RunPipelineDialog/run-request.state.svelte.ts';
  import PipelineChart from './PipelineChart.svelte';
  import PipelineActions from './PipelineActions.svelte';
  import PipelineStatus from './PipelineStatus.svelte';
  import { createBarCapacity } from './bar-capacity.state.svelte.ts';
  import { pipelineColumns } from './pipeline-table.columns.ts';

  interface Props {
    pipelines: PipelineMetadata[];
    historyByPipelineId: Map<string, PipelineHistory>;
    isJobsLoading?: boolean;
    isJobsError?: boolean;
    canListJobs?: boolean;
    /** Shared with the header: one agent subscription, one set of running ids. */
    runPipeline: RunPipeline;
    /** Asks for a commit first when the project has a linked repository. */
    runRequest: RunRequest;
  }

  let {
    pipelines,
    historyByPipelineId,
    isJobsLoading = false,
    isJobsError = false,
    canListJobs = true,
    runPipeline,
    runRequest,
  }: Props = $props();

  const selection = createSelection('pipelines');
  const duplicatePipeline = createMutation(() => pipelineMutations.duplicate());

  const capacity = createBarCapacity();

  const jobsOf = (pipelineId: string) => historyByPipelineId.get(pipelineId)?.jobs ?? [];

  const columns = $derived(
    pipelineColumns({ status: statusCell, history: historyCell, actions: actionsCell }),
  );
</script>

{#snippet statusCell(pipeline: PipelineMetadata)}
  <PipelineStatus
    {pipeline}
    history={historyByPipelineId.get(pipeline.id)}
    count={capacity.count}
    note={originNote(pipeline.origin, runRequest.link?.defaultBranch)}
    onOpen={canListJobs ? () => scyllaNavigate.goToJobs(pipeline.id, pipeline.name) : undefined}
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
      count={capacity.count}
      measure={capacity.measure}
      isLoading={isJobsLoading}
      isError={isJobsError}
      isForbidden={canListJobs === false}
      onSelectJob={jobId =>
        scyllaNavigate.goToJobDetails(pipeline.id, jobId, { pipelineName: pipeline.name })}
    />
  </div>
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
        void runRequest.start(pipeline);
      }}
      fromFile={pipeline.origin.source === 'file'}
      onEdit={event => {
        event.stopPropagation();
        if (pipeline.origin.source === 'file') {
          scyllaNavigate.goToFilePipeline(pipeline.id, pipeline.name);
        } else {
          scyllaNavigate.goToEditPipeline(pipeline.id, pipeline.name);
        }
      }}
      onDuplicate={event => {
        event.stopPropagation();
        duplicatePipeline.mutate(pipeline.id);
      }}
      onViewJobs={canListJobs
        ? event => {
            event.stopPropagation();
            scyllaNavigate.goToJobs(pipeline.id, pipeline.name);
          }
        : undefined}
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
