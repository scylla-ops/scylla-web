<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import LockIcon from '@lucide/svelte/icons/lock';
  import UnplugIcon from '@lucide/svelte/icons/unplug';
  import { Handle, Position } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { blueprintMessages } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.messages.ts';
  import { DETAILED_NODE } from './node-geometry.ts';
  import { handleClass, type StepNodeViewProps } from './node-view.ts';

  let { step, selected, summary, detached }: StepNodeViewProps = $props();

  const handle = $derived(handleClass(summary, selected));
</script>

<!-- A card: the icon of the kind on the left, the id on the right, what it runs below. -->
<div
  class={cn(
    'rounded-[10px] border bg-card p-3 shadow-xs transition-[border-color,box-shadow] duration-150',
    summary.problem && 'border-destructive',
    !summary.problem && selected && cn(summary.tone.border, 'ring-[3px]', summary.tone.ring),
    !summary.problem && !selected && 'hover:border-input',
  )}
  style="width: {DETAILED_NODE.width}px;"
>
  <Handle type="target" position={Position.Left} class={handle} />

  <div class="flex items-center gap-2.5">
    <span
      class={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-lg',
        summary.tone.tile,
        summary.tone.text,
      )}
    >
      <summary.icon class="size-4" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[13px] leading-tight font-semibold">{step.id}</p>
      <p class="text-[11px] text-muted-foreground">{summary.kind}</p>
    </div>
  </div>

  {#if summary.problem}
    <p
      class="mt-2 flex items-center gap-1.5 rounded-md bg-destructive-subtle px-2 py-1 text-[11.5px] text-destructive"
      title={summary.problem.detail}
    >
      <CircleAlertIcon class="size-3.5 shrink-0" />
      {summary.problem.label}
      {#if summary.problem.detail !== summary.problem.label}
        <span class="sr-only">{summary.problem.detail}</span>
      {/if}
    </p>
  {:else}
    <p class="mt-2 truncate rounded-md bg-muted px-2 py-1 font-mono text-[11.5px]">
      {summary.preview}
    </p>
  {/if}

  {#if detached}
    <p
      class="mt-2 flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11.5px]"
      title={t(blueprintMessages.detachedHint)}
    >
      <UnplugIcon class="size-3.5 shrink-0 text-warning" />
      {t(blueprintMessages.detached)}
      <span class="sr-only">{t(blueprintMessages.detachedHint)}</span>
    </p>
  {/if}

  {#if summary.workingDir || summary.variables || summary.secrets}
    <div class="mt-2 flex items-center gap-2.5 text-[11px] text-muted-foreground">
      {#if summary.workingDir}
        <span class="flex min-w-0 items-center gap-1">
          <FolderIcon class="size-3 shrink-0" /><span class="truncate">{summary.workingDir}</span>
        </span>
      {/if}
      {#if summary.variables}
        <span class="shrink-0">{t(blueprintMessages.variables(summary.variables))}</span>
      {/if}
      {#if summary.secrets}
        <span class="flex shrink-0 items-center gap-1">
          <LockIcon class="size-3" />{t(blueprintMessages.secrets(summary.secrets))}
        </span>
      {/if}
    </div>
  {/if}

  <Handle type="source" position={Position.Right} class={handle} />
</div>
