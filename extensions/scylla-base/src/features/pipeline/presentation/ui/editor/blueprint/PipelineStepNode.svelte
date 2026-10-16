<script lang="ts">
  import FileCodeIcon from '@lucide/svelte/icons/file-code-2';
  import TerminalIcon from '@lucide/svelte/icons/terminal';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import type { BlueprintStepNode } from '../../../utils/blueprint-converter.ts';
  import { blueprintMessages } from './blueprint.messages.ts';
  import { summarizeStep } from './step-summary.ts';

  let { data, selected }: NodeProps<BlueprintStepNode> = $props();

  const step = $derived(data.step);
  const summary = $derived(summarizeStep(step));
  const details = $derived(
    [
      step.env.length > 0 ? t(blueprintMessages.variableCount(step.env.length)) : '',
      step.workingDir ?? '',
    ].filter(Boolean),
  );

  const handleClass = 'size-2.5! border-2! border-primary! bg-card!';
</script>

<!-- A step. The panel edits it; the outer `.is-drop-target` is set while a block is dragged over. -->
<div
  class={cn(
    'flex w-[220px] cursor-pointer flex-col gap-1.5 rounded-xl border bg-card px-3 py-2.5 text-left shadow-[0_2px_6px_-3px_oklch(0_0_0/0.18)] transition-[box-shadow,border-color] duration-150',
    'hover:border-primary/60 [.is-drop-target_&]:border-primary [.is-drop-target_&]:ring-4 [.is-drop-target_&]:ring-primary/15',
    selected ? 'border-primary ring-4 ring-primary/20' : 'border-border',
  )}
>
  <Handle type="target" position={Position.Left} class={handleClass} />

  <div class="flex min-w-0 items-center gap-2">
    <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
      {#if step.kind === 'script'}
        <FileCodeIcon class="size-3.5" />
      {:else}
        <TerminalIcon class="size-3.5" />
      {/if}
    </span>
    <span class="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold">{step.id}</span>
    <span
      class="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
    >
      {summary.tag}
    </span>
  </div>

  {#if summary.isEmpty}
    <span class="flex items-center gap-1.5 rounded-md bg-warning/15 px-1.5 py-1 text-[11.5px] font-medium">
      <TriangleAlertIcon class="size-3.5 shrink-0 text-warning" />
      {step.kind === 'script' ? t(blueprintMessages.emptyScript) : t(blueprintMessages.noProgram)}
    </span>
  {:else}
    <code class="truncate rounded-md bg-muted/70 px-1.5 py-1 font-mono text-[11.5px] text-foreground/80">
      {summary.preview}
    </code>
  {/if}

  {#if details.length > 0}
    <span class="truncate text-[11px] text-muted-foreground">{details.join(' · ')}</span>
  {/if}

  <Handle type="source" position={Position.Right} class={handleClass} />
</div>
