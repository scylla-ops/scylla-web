<script lang="ts">
  import { contextStore } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { ErrorState } from '@scylla/ui';
  import { toRune } from '@scylla/ui/stores';
  import { ScyllaError } from '@shared/utils/scylla-error.ts';
  import { t } from '@scylla/ui/i18n';
  import { triggerQueries } from '@base/features/triggers/presentation/triggers.queries.ts';
  import * as triggersNavigation from '@base/features/triggers/presentation/mappers/triggers-navigation.mapper.ts';
  import TriggersHeader from '../components/TriggersHeader/TriggersHeader.svelte';
  import TriggersOverview from '../components/TriggersOverview/TriggersOverview.svelte';
  import TriggersTable from '../triggers-table/TriggersTable.svelte';
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

  const errorMessage = $derived(
    triggersQuery.error instanceof ScyllaError
      ? triggersQuery.error.userMessage()
      : t(triggersMessages.loadError),
  );
</script>

{#if !pipelineId || !projectId}
  <ErrorState message={t(triggersMessages.pipelineIdMissing)} />
{:else if triggersQuery.isLoading}
  <!-- Nothing: a skeleton of the list would be the page itself. -->
{:else if triggersQuery.isError}
  <ErrorState message={errorMessage} />
{:else}
  <div class="flex flex-col gap-4 w-full min-h-full">
    <TriggersHeader
      count={triggers.length}
      triggerIds={triggers.map(trigger => trigger.id)}
      {pipelineId}
      onNew={() => triggersNavigation.toCreate(pipelineId)}
    />

    {#if triggers.length > 0}
      <TriggersOverview {triggers} />
    {/if}

    <div class="overflow-hidden">
      {#if triggers.length > 0}
        <TriggersTable {triggers} {pipelineId} {pipelineName} />
      {:else}
        <div class="flex items-center justify-center min-h-[300px]">
          <div class="text-center space-y-2">
            <p class="text-muted-foreground">{t(triggersMessages.noTriggersYet)}</p>
            <p class="text-sm text-muted-foreground">{t(triggersMessages.noTriggersBody)}</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
