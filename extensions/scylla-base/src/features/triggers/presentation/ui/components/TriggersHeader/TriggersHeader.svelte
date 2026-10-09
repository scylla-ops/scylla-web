<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { createMutation } from '@scylla/core-sdk';
  import { CopyableText, FeatureHeader } from '@scylla/ui';
  import { createFeatureSelection } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import { triggerMutations } from '../../../triggers.queries.ts';
  import { triggersMessages } from '../../triggers.messages.ts';

  interface Props {
    count: number;
    triggerIds: string[];
    pipelineId: string;
    onNew: () => void;
  }

  let { count, triggerIds, pipelineId, onNew }: Props = $props();

  const deleteTrigger = createMutation(() => triggerMutations.remove(pipelineId));

  // A getter: the ids arrive later.
  const selection = createFeatureSelection('triggers', () => triggerIds, {
    deleteItem: id => deleteTrigger.mutateAsync(id),
  });

  // One permission covers every write.
  const canManage = $derived(can(Permission.MANAGE_TRIGGERS));
</script>

{#snippet pipelineIdLine()}
  <div class="flex items-center gap-2">
    <span class="text-sm text-muted-foreground font-medium">
      {t(triggersMessages.pipelineIdLabel)}
    </span>
    <CopyableText value={pipelineId} class="text-sm text-muted-foreground font-medium" />
  </div>
{/snippet}

<FeatureHeader
  {count}
  label={t(triggersMessages.trigger)}
  pluralLabel={t(triggersMessages.triggers)}
  newLabel={t(triggersMessages.newTrigger)}
  {onNew}
  canNew={canManage}
  newDeniedReason={t(triggersMessages.manageDenied)}
  canDelete={canManage}
  deleteDeniedReason={t(triggersMessages.manageDenied)}
  underLabel={pipelineIdLine}
  {...selection.headerProps}
/>
