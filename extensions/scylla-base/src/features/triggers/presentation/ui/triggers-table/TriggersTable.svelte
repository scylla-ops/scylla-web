<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import HelpCircleIcon from '@lucide/svelte/icons/help-circle';
  import WebhookIcon from '@lucide/svelte/icons/webhook';
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
  import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { TriggerKind } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { triggerMutations } from '@base/features/triggers/presentation/triggers.queries.ts';
  import * as triggersNavigation from '@base/features/triggers/presentation/mappers/triggers-navigation.mapper.ts';
  import TriggerActions from './TriggerActions/TriggerActions.svelte';
  import TriggerSourceCell from './TriggerSourceCell/TriggerSourceCell.svelte';
  import TriggerStatusCell from './TriggerStatusCell/TriggerStatusCell.svelte';
  import { triggerColumns } from './triggers-table.columns.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

  interface Props {
    triggers: TriggerEntity[];
    pipelineId: string;
    pipelineName: string;
  }

  let { triggers, pipelineId, pipelineName }: Props = $props();

  const SOURCE_ICON = {
    [TriggerKind.Cron]: ClockIcon,
    [TriggerKind.Webhook]: WebhookIcon,
    [TriggerKind.Unknown]: HelpCircleIcon,
  } as const;

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
      // Go to the run just created.
      .then(() => scyllaNavigate.goToJobs(pipelineId, pipelineName))
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
  {@const Icon = SOURCE_ICON[trigger.source.kind]}
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
  <TriggerSourceCell {trigger} />
{/snippet}

{#snippet statusCell(trigger: TriggerEntity)}
  <TriggerStatusCell {trigger} />
{/snippet}

{#snippet enabledCell(trigger: TriggerEntity)}
  <!-- Toggling the switch must not select the row. -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex justify-center" onclick={event => event.stopPropagation()}>
    <Switch
      checked={trigger.enabled}
      onCheckedChange={checked => setEnabled.mutate({ triggerId: trigger.id, enabled: checked })}
      aria-label={t(triggersMessages.toggleEnabled(trigger.name))}
    />
  </div>
{/snippet}

{#snippet actionsCell(trigger: TriggerEntity)}
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
{/snippet}

<DataTable
  {columns}
  data={triggers}
  onRowClick={row => selection.select(row.original.id)}
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
