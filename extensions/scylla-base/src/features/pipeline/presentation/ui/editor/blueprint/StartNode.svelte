<script lang="ts">
  import PlayIcon from '@lucide/svelte/icons/play';
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import type { BlueprintStartNode } from '../../../utils/blueprint-converter.ts';
  import { pipelineMessages } from '../../../pipeline.messages.ts';

  let { data, selected }: NodeProps<BlueprintStartNode> = $props();
</script>

<!-- The pipeline itself: every step without a dependency hangs off it. Not deletable. -->
<div
  class={cn(
    'flex w-[200px] cursor-pointer flex-col gap-1 rounded-xl bg-primary px-3 py-2.5 text-primary-foreground shadow-[0_6px_18px_-8px_oklch(0_0_0/0.45)]',
    selected && 'ring-4 ring-primary/25',
  )}
>
  <span class="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase opacity-90">
    <PlayIcon class="size-3.5 fill-current" />
    {t(pipelineMessages.pipeline)}
  </span>
  <span class="truncate text-[15px] font-semibold">
    {data.name || t(pipelineMessages.unnamedPipeline)}
  </span>

  <Handle
    type="source"
    position={Position.Right}
    class="size-2.5! border-2! border-primary! bg-primary-foreground!"
  />
</div>
