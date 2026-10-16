<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import UnplugIcon from '@lucide/svelte/icons/unplug';
  import { blueprintMessages } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.messages.ts';
  import { MINIMAL_NODE, minimalHandleStyle } from './node-geometry.ts';
  import { handleClass, type StepNodeViewProps } from './node-view.ts';

  let { step, selected, summary, detached }: StepNodeViewProps = $props();

  const handle = $derived(handleClass(summary, selected));
</script>

<!--
  A flat square: one colour, the icon's. The label sits under it but inside the node, so
  that xyflow measures it (selection box, fit view). The handles sit on the square's sides.
-->
<div class="flex flex-col items-center gap-2" style="width: {MINIMAL_NODE.width}px;">
  <div
    class={cn(
      'relative flex items-center justify-center rounded-[18px] border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.05),0_2px_8px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] duration-150',
      summary.problem && 'border-destructive',
      !summary.problem && selected && cn(summary.tone.border, 'ring-[3px]', summary.tone.ring),
      !summary.problem && !selected && 'border-foreground/12',
    )}
    style="width: {MINIMAL_NODE.tile}px; height: {MINIMAL_NODE.tile}px;"
  >
    <summary.icon class={cn('size-6.5', summary.tone.text)} />
    {#if summary.problem}
      <span
        class="absolute -top-1.5 -right-1.5 flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
        aria-hidden="true"
        title={summary.problem.detail}>!</span
      >
      <span class="sr-only">{summary.problem.detail}</span>
    {/if}
    {#if detached}
      <span
        class="absolute -top-1.5 -left-1.5 flex size-4.5 items-center justify-center rounded-full border border-warning/40 bg-card"
        title={t(blueprintMessages.detachedHint)}
      >
        <UnplugIcon class="size-2.5 text-warning" />
      </span>
      <span class="sr-only">{t(blueprintMessages.detachedHint)}</span>
    {/if}
  </div>
  <div class="w-full text-center">
    <p class="truncate text-[12.5px] font-medium">{step.id}</p>
    <p class="text-[11px] text-muted-foreground">{summary.kind}</p>
  </div>

  <Handle type="target" position={Position.Left} class={handle} style={minimalHandleStyle('left')} />
  <Handle type="source" position={Position.Right} class={handle} style={minimalHandleStyle('right')} />
</div>
