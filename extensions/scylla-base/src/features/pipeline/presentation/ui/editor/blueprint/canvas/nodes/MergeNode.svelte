<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { cn } from '@scylla/ui/utils';
  import { handleClass } from '@base/features/pipeline/presentation/presenters/node-summary.presenter.ts';
  import type { PipelineNodeViewProps } from './node-appearances.registry.ts';

  let { node, selected, summary }: PipelineNodeViewProps = $props();

  const handle = $derived(handleClass(summary, selected));
</script>

<!-- A merge: a small pill that many edges go into, and one goes out of. -->
<div
  class={cn(
    'flex items-center gap-2 rounded-full border bg-card py-1.5 pr-3 pl-1.5 shadow-xs transition-[border-color,box-shadow] duration-150',
    summary.problem && 'border-destructive',
    !summary.problem && selected && cn(summary.tone.border, 'ring-[3px]', summary.tone.ring),
  )}
  title={summary.problem?.detail}
>
  <Handle type="target" position={Position.Left} class={handle} />
  <span
    class={cn('flex size-6 items-center justify-center rounded-full', summary.tone.tile, summary.tone.text)}
  >
    <summary.icon class="size-3.5" />
  </span>
  <span class="max-w-32 truncate text-[12.5px] font-medium">{node.id}</span>
  {#if summary.problem}
    <span class="sr-only">{summary.problem.detail}</span>
  {/if}
  <Handle type="source" position={Position.Right} class={handle} />
</div>
