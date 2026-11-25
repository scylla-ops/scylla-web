<script lang="ts">
  import ZapIcon from '@lucide/svelte/icons/zap';
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import type { PipelineStartContext } from '@base/features/pipeline';
  import { triggerPanelMessages } from '@base/features/triggers/presentation/messages/trigger-panel.messages.ts';
  import { triggerQueries } from '@base/features/triggers/presentation/triggers.queries.ts';

  interface Props {
    context: PipelineStartContext;
  }

  let { context }: Props = $props();

  const query = createQuery(() => triggerQueries.byPipeline(context.pipelineId));
  const count = $derived(query.data?.length);
  const label = $derived(count === undefined ? '' : t(triggerPanelMessages.triggerCount(count)));
</script>

<!-- On the start node: the count of the triggers of the pipeline. A click on the node opens them. -->
{#if count !== undefined}
  <span
    class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-1 rounded-full border border-primary/30 bg-card px-1.5 text-[11px] leading-none font-semibold text-primary tabular-nums shadow-xs"
    title={label}
  >
    <ZapIcon class="size-3 shrink-0" aria-hidden="true" />
    <span aria-hidden="true">{count}</span>
    <span class="sr-only">{label}</span>
  </span>
{/if}
