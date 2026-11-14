<script lang="ts">
  import { contextStore } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import { toRune } from '@scylla/ui/stores';
  import { ScyllaError } from '@shared/utils/scylla-error.ts';
  import { t } from '@scylla/ui/i18n';
  import { repositoryLinkQueries } from '@base/features/integrations';
  import { isGitSource } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { triggerQueries } from '@base/features/triggers/presentation/triggers.queries.ts';
  import * as triggersNavigation from '@base/features/triggers/presentation/mappers/triggers-navigation.mapper.ts';
  import GitTriggerNotes from '../components/GitTriggerNotes/GitTriggerNotes.svelte';
  import TriggersHeader from '../components/TriggersHeader/TriggersHeader.svelte';
  import TriggersOverview from '../components/TriggersOverview/TriggersOverview.svelte';
  import TriggersTable from '../triggers-table/TriggersTable.svelte';
  import { createPipelineOrigin } from '../pipeline-origin.state.svelte.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

  interface Props {
    pipelineId?: string;
    projectId?: string;
  }

  let { pipelineId, projectId }: Props = $props();

  const context = toRune(contextStore);
  const pipelineName = $derived(context().pipeline?.name ?? '');

  const triggersQuery = createQuery(() => triggerQueries.byPipeline(pipelineId ?? ''));
  const triggers = $derived(triggersQuery.data ?? []);
  // The triggers of a pipeline file have no row to delete.
  const ownTriggerIds = $derived(
    triggers.filter(trigger => !trigger.fromFile).map(trigger => trigger.id),
  );
  const hasGitTrigger = $derived(triggers.some(trigger => isGitSource(trigger.source)));

  const linkQuery = createQuery(() => repositoryLinkQueries.byProject(projectId ?? ''));
  const provider = $derived(linkQuery.data?.provider);
  const origin = createPipelineOrigin(() => pipelineId ?? '');

  const errorMessage = $derived(
    triggersQuery.error instanceof ScyllaError
      ? triggersQuery.error.userMessage()
      : t(triggersMessages.loadError),
  );
</script>

{#if !pipelineId || !projectId}
  <ErrorState message={t(triggersMessages.pipelineIdMissing)} />
{:else if triggersQuery.isLoading}
  <!-- The header and the rows of the triggers table. -->
  <ListSkeleton header rows={4} rowClass="h-12 w-full" />
{:else if triggersQuery.isError}
  <ErrorState message={errorMessage} />
{:else}
  <div class="flex min-h-full w-full shrink-0 flex-col gap-4 pb-20" data-tour="triggers">
    <TriggersHeader
      count={triggers.length}
      triggerIds={ownTriggerIds}
      {pipelineId}
      onNew={() => triggersNavigation.toCreate(pipelineId)}
    />

    {#if triggers.length > 0}
      <TriggersOverview {triggers} />
    {/if}

    <div class="overflow-hidden">
      {#if triggers.length > 0}
        <TriggersTable
          {triggers}
          {pipelineId}
          {pipelineName}
          {provider}
          filePath={origin.filePath}
        />
      {:else}
        <div class="flex items-center justify-center min-h-[300px]">
          <div class="text-center space-y-2">
            <p class="text-muted-foreground">{t(triggersMessages.noTriggersYet)}</p>
            <p class="text-sm text-muted-foreground">{t(triggersMessages.noTriggersBody)}</p>
          </div>
        </div>
      {/if}
    </div>

    {#if hasGitTrigger}
      <GitTriggerNotes {provider} />
    {/if}
  </div>
{/if}
