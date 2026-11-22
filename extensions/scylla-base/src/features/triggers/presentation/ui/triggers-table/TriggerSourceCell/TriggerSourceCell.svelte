<script lang="ts">
  import ListFilterIcon from '@lucide/svelte/icons/list-filter';
  import { CopyableText } from '@scylla/ui';
  import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { VcsProvider } from '@base/features/integrations';
  import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { convertCronToLocal } from '@base/features/triggers/presentation/mappers/cron-timezone.mapper.ts';
  import {
    gitKindLabel,
    gitSourceSummary,
  } from '@base/features/triggers/presentation/presenters/trigger-source.presenter.ts';
  import { conditionSummary } from '@base/features/triggers/presentation/presenters/webhook-condition.presenter.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

  interface Props {
    trigger: TriggerEntity;
    provider?: VcsProvider;
    /** The file that defines a trigger of a file pipeline, when it is known. */
    filePath?: string;
  }

  let { trigger, provider, filePath = '' }: Props = $props();
</script>

{#if trigger.source.kind === 'cron'}
  <div class="flex items-center justify-center gap-2">
    <code class="font-mono text-xs text-muted-foreground">
      {convertCronToLocal(trigger.source.expression) || '—'}
    </code>
  </div>
{:else if trigger.source.kind === 'webhook'}
  {@const conditions = trigger.source.conditions}
  <div class="flex w-full min-w-0 flex-col items-center justify-center gap-1">
    <CopyableText
      value={trigger.source.webhookUrl}
      showFullOnHover
      copyLabel={t(triggersMessages.copyUrl)}
      class="w-full justify-center"
    />
    {#if conditions.length > 0}
      <!-- The conditions of the deliveries: the tooltip lists them. -->
      <Tooltip>
        <TooltipTrigger>
          {#snippet child({ props })}
            <Badge {...props} tabindex={0} variant="outline">
              <ListFilterIcon aria-hidden="true" />
              <span class="[text-box:trim-both_cap_alphabetic]">
                {t(triggersMessages.conditionCount(conditions.length))}
              </span>
            </Badge>
          {/snippet}
        </TooltipTrigger>
        <TooltipContent>
          <ul class="flex flex-col gap-0.5 font-mono">
            {#each conditions as condition, index (index)}
              <li>{conditionSummary(condition)}</li>
            {/each}
          </ul>
        </TooltipContent>
      </Tooltip>
    {/if}
  </div>
{:else if trigger.source.kind === 'unknown'}
  <div class="flex items-center justify-center">
    <code class="font-mono text-xs text-muted-foreground">—</code>
  </div>
{:else}
  <!-- "Push · main, release/*": the kind, then its rules. -->
  <div class="flex min-w-0 flex-col items-center justify-center gap-0.5">
    <div class="flex min-w-0 items-center justify-center gap-1.5 text-sm">
      <span class="font-medium">{gitKindLabel(trigger.source.kind, provider)}</span>
      <span class="text-muted-foreground" aria-hidden="true">·</span>
      <code class="truncate font-mono text-xs text-muted-foreground">
        {gitSourceSummary(trigger.source)}
      </code>
    </div>
    {#if trigger.fromFile}
      <span class="text-xs text-muted-foreground">
        {filePath ? t(triggersMessages.definedIn(filePath)) : t(triggersMessages.definedInFile)}
      </span>
    {/if}
  </div>
{/if}
