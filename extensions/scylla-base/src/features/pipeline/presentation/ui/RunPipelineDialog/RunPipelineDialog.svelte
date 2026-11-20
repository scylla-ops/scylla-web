<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { runMessages } from '@base/features/pipeline/presentation/messages/run.messages.ts';
  import { pipelineQueries } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import type { RunRequest } from './run-request.state.svelte.ts';
  import RunPipelineForm from './RunPipelineForm.svelte';

  interface Props {
    request: RunRequest;
  }

  let { request }: Props = $props();

  const pipelineId = $derived(request.asked?.id ?? '');
  // The path of a file pipeline: the list has it, the jobs page does not. Read while open only.
  const pipelineQuery = createQuery(() => ({
    ...pipelineQueries.byId(pipelineId),
    enabled: request.open && !!pipelineId,
  }));
  const origin = $derived(pipelineQuery.data?.origin);
  const name = $derived(request.asked?.name.trim() || pipelineQuery.data?.pipeline.name || '');
</script>

<ScyllaDialog
  open={request.open}
  onOpenChange={open => {
    if (!open) request.close();
  }}
  title={name ? t(runMessages.title(name)) : t(runMessages.titleUnnamed)}
  description={t(runMessages.description)}
  class="sm:max-w-lg"
>
  {#if request.link}
    <RunPipelineForm
      link={request.link}
      filePath={origin?.source === 'file' ? origin.filePath : undefined}
      onCancel={() => request.close()}
      onRun={ref => void request.confirm(ref)}
    />
  {/if}
</ScyllaDialog>
