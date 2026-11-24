<script lang="ts">
  import { loadJobsPage } from '@base/features/jobs';
  import { repositoryLinkQueries } from '@base/features/integrations';
  import { contextStore } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { toRune } from '@scylla/ui/stores';
  import { createRunPipeline } from '../run-pipeline.state.svelte.ts';
  import { createRunRequest } from '../RunPipelineDialog/run-request.state.svelte.ts';
  import RunPipelineDialog from '../RunPipelineDialog/RunPipelineDialog.svelte';
  import JobFilters from '../JobFilters/JobFilters.svelte';
  import { createJobFilters } from '../JobFilters/job-filters.state.svelte.ts';

  interface Props {
    projectId?: string;
    pipelineId?: string;
  }

  let { projectId, pipelineId }: Props = $props();

  const context = toRune(contextStore);

  const runPipeline = createRunPipeline();
  const runRequest = createRunRequest({ projectId: () => projectId ?? '', runPipeline });

  // The jobs of a project with no linked repository have no commit: no filter to offer.
  const filters = createJobFilters();
  const linked = $derived(!!runRequest.link);
  const refsQuery = createQuery(() =>
    repositoryLinkQueries.refs({ projectId: projectId ?? '', kind: 'branch' }, linked),
  );
</script>

{#snippet toolbar()}
  <JobFilters {filters} refs={refsQuery.data?.refs ?? []} loading={refsQuery.isPending} />
{/snippet}

<!-- `jobs` renders the list; the Run action is composed here, so the dependency stays pipeline → jobs. -->
{#await loadJobsPage() then page}
  <page.default
    {pipelineId}
    onRun={() =>
      runRequest.start({ id: pipelineId ?? '', name: context().pipeline.name ?? '' })}
    filter={linked ? filters.filter : undefined}
    toolbar={linked ? toolbar : undefined}
  />
{/await}

<RunPipelineDialog request={runRequest} />
