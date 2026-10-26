<script lang="ts">
  import { CopyableText } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { TriggerKind } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { convertCronToLocal } from '@base/features/triggers/presentation/mappers/cron-timezone.mapper.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

  interface Props {
    trigger: TriggerEntity;
  }

  let { trigger }: Props = $props();
</script>

{#if trigger.source.kind === TriggerKind.Cron}
  <div class="flex items-center justify-center gap-2">
    <code class="font-mono text-xs text-muted-foreground">
      {convertCronToLocal(trigger.source.expression) || '—'}
    </code>
  </div>
{:else if trigger.source.kind === TriggerKind.Webhook}
  <CopyableText
    value={trigger.source.webhookUrl}
    showFullOnHover
    copyLabel={t(triggersMessages.copyUrl)}
    class="w-full justify-center"
  />
{:else}
  <div class="flex items-center justify-center">
    <code class="font-mono text-xs text-muted-foreground">—</code>
  </div>
{/if}
