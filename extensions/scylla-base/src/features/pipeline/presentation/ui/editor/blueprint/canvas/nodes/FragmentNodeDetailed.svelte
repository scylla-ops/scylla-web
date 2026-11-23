<script lang="ts">
  import UnplugIcon from '@lucide/svelte/icons/unplug';
  import { Handle, Position } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { DETAILED_NODE } from '@base/features/pipeline/presentation/presenters/blueprint-geometry.presenter.ts';
  import { FragmentIcon } from '@shared/presentation/ui';
  import FragmentBadges from './FragmentBadges.svelte';
  import type { FragmentNodeViewProps } from './node-appearances.registry.ts';

  let { name, nodeCount, summary, selected, detached }: FragmentNodeViewProps = $props();

  const handle = $derived(cn('size-2.5! border-[1.5px]! bg-card!', selected ? 'border-info!' : 'border-info/60!'));
</script>

<!-- A card in the colour of the library: the name, the version, and the nodes it holds. -->
<div
  class={cn(
    'relative rounded-[10px] border-[1.5px] bg-card p-3 shadow-xs transition-[border-color,box-shadow] duration-150',
    summary.missing ? 'border-destructive' : 'border-info/70',
    selected && 'ring-[3px] ring-info/20',
  )}
  style="width: {DETAILED_NODE.width}px;"
>
  <Handle type="target" position={Position.Left} class={handle} />
  <FragmentBadges {summary} />

  <div class="flex items-center gap-2.5">
    <FragmentIcon compact class="size-7" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-[13px] leading-tight font-semibold">{name}</p>
      <p class="text-[11px] text-muted-foreground">{t(libraryMessages.blockKind(nodeCount))}</p>
    </div>
    <span class="rounded-full bg-info px-1.5 py-0.5 text-[10.5px] font-semibold text-info-foreground">
      {t(libraryMessages.version(summary.version))}
    </span>
  </div>

  <p class="mt-2 truncate rounded-md bg-info/10 px-2 py-1 font-mono text-[11.5px]">
    {summary.preview}
  </p>

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

  <Handle type="source" position={Position.Right} class={handle} />
</div>
