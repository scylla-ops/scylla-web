<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { START_ICON } from '@base/features/pipeline/presentation/presenters/step-kind.presenter.ts';
  import { MINIMAL_NODE, minimalHandleStyle } from '@base/features/pipeline/presentation/presenters/blueprint-node.presenter.ts';
  import type { StartNodeViewProps } from './node-appearances.registry.ts';

  let { name, selected }: StartNodeViewProps = $props();
</script>

<div class="flex flex-col items-center gap-2" style="width: {MINIMAL_NODE.width}px;">
  <div
    class={cn(
      'flex items-center justify-center rounded-[18px] border border-primary/45 bg-card shadow-xs',
      selected && 'ring-[3px] ring-primary/20',
    )}
    style="width: {MINIMAL_NODE.tile}px; height: {MINIMAL_NODE.tile}px;"
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
    style={minimalHandleStyle('right')}
  />
</div>
