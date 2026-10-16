<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    BlueprintStartNode,
  } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { getBlueprintCanvas } from '../blueprint-canvas.context.ts';
  import { START_ICON } from '../step-icons.ts';

  let { data, selected }: NodeProps<BlueprintStartNode> = $props();

  const canvas = getBlueprintCanvas();
  const name = $derived(data.name || t(pipelineMessages.unnamedPipeline));
  const ring = $derived(selected && 'ring-[3px] ring-primary/20');
</script>

<!-- The pipeline itself: every step without a dependency hangs off it. Not deletable. -->
{#if canvas.appearance() === 'minimal'}
  <div class="flex w-35 flex-col items-center gap-2">
    <div
      class={cn(
        'flex size-16 items-center justify-center rounded-[18px] border border-primary/45 bg-card shadow-xs',
        ring,
      )}
    >
      <START_ICON class="size-6 fill-primary text-primary" />
    </div>
    <div class="w-full text-center">
      <p class="truncate text-[12.5px] font-semibold">{name}</p>
      <p class="text-[11px] text-muted-foreground">{t(pipelineMessages.pipeline)}</p>
    </div>
    <Handle
      type="source"
      position={Position.Right}
      class="size-2.5! border-[1.5px]! border-primary! bg-card!"
      style="right: 38px; top: 32px;"
    />
  </div>
{:else}
  <div
    class={cn(
      'flex w-45 items-center gap-2.5 rounded-[10px] border border-primary/45 bg-card px-3 py-2.5 shadow-xs',
      ring,
    )}
  >
    <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary">
      <START_ICON class="size-3.5 fill-primary-foreground text-primary-foreground" />
    </span>
    <div class="min-w-0">
      <p class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {t(pipelineMessages.pipeline)}
      </p>
      <p class="truncate text-[13px] font-semibold">{name}</p>
    </div>
    <Handle
      type="source"
      position={Position.Right}
      class="size-2.5! border-[1.5px]! border-primary! bg-card!"
    />
  </div>
{/if}
