<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { Permission, can } from '@platform/authz';
  import { scyllaNavigate } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { Switch } from '@scylla/ui/primitives';
  import {
    ConfirmOperationAlertDialog,
    CopyableText,
    DataTable,
  } from '@scylla/ui';
  import { createSelection } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import type { VcsProvider } from '@base/features/integrations';
  import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { triggerMutations } from '@base/features/triggers/presentation/triggers.queries.ts';
  import * as triggersNavigation from '@base/features/triggers/presentation/mappers/triggers-navigation.mapper.ts';
  import TriggerActions from './TriggerActions/TriggerActions.svelte';
  import TriggerSourceCell from './TriggerSourceCell/TriggerSourceCell.svelte';
  import TriggerStatusCell from './TriggerStatusCell/TriggerStatusCell.svelte';
  import { triggerColumns } from './triggers-table.columns.ts';
  import { KIND_ICONS } from '../trigger-kind-icons.registry.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

  interface Props {
    triggers: TriggerEntity[];
    pipelineId: string;
    pipelineName: string;
    /** The provider of the linked repository: GitLab names a pull request "merge request". */
    provider?: VcsProvider;
    /** The file of a file pipeline, which defines its Git triggers. */
    filePath?: string;
  }

  let { triggers, pipelineId, pipelineName, provider, filePath = '' }: Props = $props();

  const selection = createSelection('triggers');
  const deleteTrigger = createMutation(() => triggerMutations.remove(pipelineId));
  const setEnabled = createMutation(() => triggerMutations.setEnabled(pipelineId));
  const fireNow = createMutation(() => triggerMutations.fireNow(pipelineId));

  let deleteTargetId = $state<string | null>(null);
  const firingIds = new SvelteSet<string>();

  const handleFire = (trigger: TriggerEntity) => {
    firingIds.add(trigger.id);

    fireNow
      .mutateAsync(trigger.id)
      // Go to the run just created, when the user may list the jobs.
      .then(() => {
        if (can(Permission.LIST_JOBS_BY_PIPELINE)) scyllaNavigate.goToJobs(pipelineId, pipelineName);
      })
      .catch(() => {
        // The global mutation handler toasts the error.
      })
      .finally(() => {
        firingIds.delete(trigger.id);
      });
  };

  const columns = $derived(
    triggerColumns({
      name: nameCell,
      source: sourceCell,
      status: statusCell,
      enabled: enabledCell,
      actions: actionsCell,
    }),
  );
</script>

{#snippet nameCell(trigger: TriggerEntity)}
  {@const Icon = KIND_ICONS[trigger.source.kind]}
  <div class="flex w-full min-w-0 flex-row items-center gap-3">
    <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <Icon class="size-4 text-primary" />
    </div>
    <div class="flex min-w-0 flex-col text-start">
      <p class="truncate font-semibold text-foreground">{trigger.name}</p>
      <CopyableText
        class="text-xs text-muted-foreground/80"
        value={trigger.id}
        display={`ID: ${trigger.id}`}
      />
    </div>
  </div>
{/snippet}

{#snippet sourceCell(trigger: TriggerEntity)}
  <TriggerSourceCell {trigger} {provider} {filePath} />
{/snippet}

{#snippet statusCell(trigger: TriggerEntity)}
  <TriggerStatusCell {trigger} />
{/snippet}

{#snippet enabledCell(trigger: TriggerEntity)}
  <!-- Toggling the switch must not select the row. -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex justify-center" onclick={event => event.stopPropagation()}>
    <!-- A trigger of a pipeline file follows its pipeline: only the file changes it. -->
    <Switch
      checked={trigger.enabled}
      disabled={trigger.fromFile}
      onCheckedChange={checked => setEnabled.mutate({ triggerId: trigger.id, enabled: checked })}
      aria-label={t(triggersMessages.toggleEnabled(trigger.name))}
    />
  </div>
{/snippet}

{#snippet actionsCell(trigger: TriggerEntity)}
  {#if !trigger.fromFile}
    <TriggerActions
      isFiring={firingIds.has(trigger.id)}
      onFire={event => {
        event.stopPropagation();
        handleFire(trigger);
      }}
      onEdit={event => {
        event.stopPropagation();
        triggersNavigation.toEdit(pipelineId, trigger.id);
      }}
      onDelete={event => {
        event.stopPropagation();
        deleteTargetId = trigger.id;
      }}
    />
  {/if}
{/snippet}

<DataTable
  {columns}
  data={triggers}
  onRowClick={row => {
    if (!row.original.fromFile) selection.select(row.original.id);
  }}
  getRowId={trigger => trigger.id}
  isRowSelected={trigger => selection.selectedIds.includes(trigger.id)}
  alignColumnsCenter
/>

<ConfirmOperationAlertDialog
  open={deleteTargetId !== null}
  onOpenChange={open => {
    if (!open) deleteTargetId = null;
  }}
  onContinue={() => {
    if (!deleteTargetId) return;
    deleteTrigger.mutate(deleteTargetId);
    deleteTargetId = null;
  }}
/>
