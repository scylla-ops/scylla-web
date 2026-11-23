<script lang="ts">
  import LayersIcon from '@lucide/svelte/icons/layers';
  import { Handle, Position } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { HANDLE } from '@base/features/pipeline/presentation/presenters/node-summary.presenter.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import {
    MINIMAL_NODE,
    minimalHandleStyle,
  } from '@base/features/pipeline/presentation/presenters/blueprint-geometry.presenter.ts';
  import FragmentBadges from './FragmentBadges.svelte';
  import type { FragmentNodeViewProps } from './node-appearances.registry.ts';

  let { name, summary, selected }: FragmentNodeViewProps = $props();

  const handle = $derived(cn(HANDLE, selected ? 'border-info!' : 'border-input!'));
</script>

<!-- The tile of a block, as the tile of a node: the label sits under it, inside the node. -->
<div class="flex flex-col items-center gap-2" style="width: {MINIMAL_NODE.width}px;">
  <div
    class={cn(
      'relative flex items-center justify-center rounded-[18px] border-[1.5px] bg-info/8 transition-[border-color,box-shadow] duration-150',
      summary.missing ? 'border-destructive' : 'border-info/70',
      selected && 'ring-[3px] ring-info/20',
    )}
    style="width: {MINIMAL_NODE.tile}px; height: {MINIMAL_NODE.tile}px;"
  >
    <LayersIcon class="size-6.5 text-info" />
    <FragmentBadges {summary} />
  </div>
  <div class="w-full text-center">
    <p class="truncate text-[12.5px] font-medium">{name}</p>
    <p class="text-[11px] text-muted-foreground">{t(libraryMessages.version(summary.version))}</p>
  </div>

  <Handle type="target" position={Position.Left} class={handle} style={minimalHandleStyle('left')} />
  <Handle type="source" position={Position.Right} class={handle} style={minimalHandleStyle('right')} />
</div>
