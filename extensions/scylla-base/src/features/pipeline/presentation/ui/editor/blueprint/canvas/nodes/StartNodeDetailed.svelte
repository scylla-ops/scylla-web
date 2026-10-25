<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { START_ICON } from '@base/features/pipeline/presentation/presenters/step-kind.presenter.ts';
  import { DETAILED_NODE } from '@base/features/pipeline/presentation/presenters/blueprint-node.presenter.ts';
  import type { StartNodeViewProps } from './node-appearances.registry.ts';

  let { name, selected }: StartNodeViewProps = $props();
</script>

<div
  class={cn(
    'flex items-center gap-2.5 rounded-[10px] border border-primary/45 bg-card px-3 py-2.5 shadow-xs',
    selected && 'ring-[3px] ring-primary/20',
  )}
  style="width: {DETAILED_NODE.startWidth}px;"
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
  <Handle type="source" position={Position.Right} class="size-2.5! border-[1.5px]! border-primary! bg-card!" />
</div>
