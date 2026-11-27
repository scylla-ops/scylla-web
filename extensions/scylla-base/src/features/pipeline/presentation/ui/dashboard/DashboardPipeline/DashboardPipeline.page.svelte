<script lang="ts">
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import { repositoryLinkQueries } from '@base/features/integrations';
  import { loadProjectTitle } from '@base/features/project';
  import { can, Permission } from '@platform/authz';
  import { scyllaNavigate } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { EmptyState, ErrorState, ListSkeleton, PaginationSlot } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    createPipelineDashboard,
  } from './pipeline-dashboard.state.svelte.ts';
  import { createRunPipeline } from '@base/features/pipeline/presentation/ui/run-pipeline.state.svelte.ts';
  import { createRunRequest } from '@base/features/pipeline/presentation/ui/RunPipelineDialog/run-request.state.svelte.ts';
  import RunPipelineDialog from '@base/features/pipeline/presentation/ui/RunPipelineDialog/RunPipelineDialog.svelte';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import PipelineDashboardHeader from './PipelineDashboardHeader.svelte';
  import PipelineTable from '../PipelineTable/PipelineTable.svelte';

  interface Props {
    projectId?: string;
  }

  let { projectId }: Props = $props();

  const dashboard = createPipelineDashboard(() => projectId ?? '');
  const runPipeline = createRunPipeline();
  const runRequest = createRunRequest({ projectId: () => projectId ?? '', runPipeline });
  const repositoryLink = createQuery(() => repositoryLinkQueries.byProject(projectId ?? ''));
  const canCreate = $derived(can(Permission.CREATE_PIPELINE, { projectId }));
</script>

<!-- The frame renders first and stays on an error: the table area's height decides what to fetch. -->
<div data-tour="pipelines" data-project-id={projectId} class="flex h-full min-h-0 w-full flex-col gap-4">
  {#if projectId}
    <!-- A loader from the barrel: the icon and the name of the project. -->
    {#await loadProjectTitle() then title}
      <title.default {projectId} repository={repositoryLink.data?.fullName} />
    {/await}
  {/if}
  <PipelineDashboardHeader
    numberOfPipelines={dashboard.pipelines ? dashboard.totalCount : undefined}
    pipelineIds={dashboard.pipelineIds}
  />

  <div {@attach dashboard.pagination.measure} class="relative min-h-0 flex-1 overflow-auto">
    <div class="relative">
      {#if dashboard.pipelines && dashboard.pipelines.length > 0}
        <PipelineTable
          pipelines={dashboard.pipelines}
          historyByPipelineId={dashboard.historyByPipelineId}
          isJobsLoading={dashboard.isJobsLoading}
          isJobsError={dashboard.isJobsError}
          canListJobs={dashboard.canListJobs}
          {runPipeline}
          {runRequest}
        />
      {:else if dashboard.isError}
        <ErrorState message={dashboard.errorMessage} />
      {:else if !dashboard.pipelines}
        <!-- The rows of the pipelines table. -->
        <ListSkeleton rows={4} rowClass="h-20 w-full" />
      {:else}
        <EmptyState
          icon={WorkflowIcon}
          title={t(pipelineMessages.noPipelines)}
          description={t(pipelineMessages.noPipelinesBody)}
          action={canCreate
            ? {
                label: t(pipelineMessages.newPipeline),
                onSelect: () => scyllaNavigate.goToCreatePipeline(),
              }
            : undefined}
        />
      {/if}
    </div>
  </div>

  <PaginationSlot
    paginationInfo={dashboard.pagination.paginationInfo}
    onPageChange={page => dashboard.pagination.setPage(page)}
  />
</div>

<RunPipelineDialog request={runRequest} />
