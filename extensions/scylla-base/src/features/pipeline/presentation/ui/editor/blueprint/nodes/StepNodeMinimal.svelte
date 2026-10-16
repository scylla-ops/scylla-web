<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { stepIcon } from '../step-icons.ts';
  import { ISSUE_MESSAGES, KIND_TONES, kindLabel, type StepNodeViewProps } from './node-view.ts';

  let { step, selected, summary }: StepNodeViewProps = $props();

  const Icon = $derived(stepIcon(step.kind));
  const tone = $derived(KIND_TONES[step.kind]);
  const kind = $derived(kindLabel(step));
  const handleClass = $derived(
    cn('size-2.5! border-[1.5px]! bg-card!', selected ? tone.handle : 'border-input!'),
  );
</script>

<!--
  A flat square: one colour, the icon's. The label sits under it but inside the node, so
  that xyflow measures it (selection box, fit view). The handles sit on the square's sides.
-->
<div class="flex w-35 flex-col items-center gap-2">
  <div
    class={cn(
      'relative flex size-16 items-center justify-center rounded-[18px] border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.05),0_2px_8px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] duration-150',
      summary.issue && 'border-destructive',
      !summary.issue && selected && cn(tone.border, 'ring-[3px]', tone.ring),
      !summary.issue && !selected && 'border-foreground/12',
    )}
  >
    <Icon class={cn('size-6.5', tone.text)} />
    {#if summary.issue}
      <span
        class="absolute -top-1.5 -right-1.5 flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
        aria-hidden="true">!</span
      >
      <span class="sr-only">{t(ISSUE_MESSAGES[summary.issue])}</span>
    {/if}
  </div>
  <div class="w-full text-center">
    <p class="truncate text-[12.5px] font-medium">{step.id}</p>
    <p class="text-[11px] text-muted-foreground">{typeof kind === 'string' ? kind : t(kind)}</p>
  </div>

  <Handle type="target" position={Position.Left} class={handleClass} style="left: 38px; top: 32px;" />
  <Handle type="source" position={Position.Right} class={handleClass} style="right: 38px; top: 32px;" />
</div>
