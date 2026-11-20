<script lang="ts">
  import { StatusShape, type StatusState } from '@scylla/ui';
  import { formatDate } from '@shared/utils/date-utils.ts';
  import { t } from '@scylla/ui/i18n';
  import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

  interface Props {
    trigger: TriggerEntity;
  }

  let { trigger }: Props = $props();

  const result = $derived(trigger.lastResult);
  const hasFired = $derived(!!result || !!trigger.lastFiredAt);
</script>

{#snippet outcome(state: StatusState, label: string, title?: string)}
  <span class="inline-flex items-center gap-1.5 text-xs" {title}>
    <StatusShape {state} {label} size={20} />
    <span aria-hidden="true">{label}</span>
  </span>
{/snippet}

<!-- Last run, and the next fire or why it is off. -->
<div class="flex flex-col items-center justify-center gap-1">
  {#if !hasFired}
    {@render outcome('idle', t(triggersMessages.neverFired))}
  {:else if result?.kind === 'failed'}
    {@render outcome('failed', t(triggersMessages.error), result.error)}
  {:else if result?.kind === 'succeeded'}
    {@render outcome('success', t(triggersMessages.ok))}
  {:else}
    <!-- An outcome arm newer than this build: do not claim success. -->
    {@render outcome('idle', t(triggersMessages.unknown))}
  {/if}

  {#if !trigger.enabled}
    <span class="text-xs text-muted-foreground">
      {trigger.source.kind === 'webhook'
        ? t(triggersMessages.disabledWebhook)
        : t(triggersMessages.disabled)}
    </span>
  {:else if trigger.source.kind === 'cron'}
    {#if trigger.nextFireAt}
      <span class="text-xs text-muted-foreground">
        {t(triggersMessages.next)}
        {formatDate(trigger.nextFireAt)}
      </span>
    {/if}
  {:else if trigger.lastFiredAt}
    <span class="text-xs text-muted-foreground">
      {t(triggersMessages.last)}
      {formatDate(trigger.lastFiredAt)}
    </span>
  {/if}
</div>
