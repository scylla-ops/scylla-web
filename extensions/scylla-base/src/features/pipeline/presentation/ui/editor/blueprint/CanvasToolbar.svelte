<script lang="ts">
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import { Panel } from '@xyflow/svelte';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    NODE_APPEARANCES,
    type NodeAppearance,
  } from '@base/features/pipeline/presentation/node-appearance.svelte.ts';
  import { blueprintMessages } from './blueprint.messages.ts';
  import { NODE_APPEARANCE_VIEWS } from './nodes/node-appearances.ts';

  interface Props {
    appearance: NodeAppearance;
    onAppearanceChange: (appearance: NodeAppearance) => void;
    onArrange: () => void;
  }

  let { appearance, onAppearanceChange, onArrange }: Props = $props();
</script>

<Panel position="top-right" class="m-3! flex items-center gap-1 rounded-[10px] border bg-card p-1 shadow-xs">
  <div role="group" aria-label={t(blueprintMessages.nodeStyle)} class="flex gap-0.5 rounded-md bg-muted p-0.5">
    {#each NODE_APPEARANCES as option (option)}
      {@const view = NODE_APPEARANCE_VIEWS[option]}
      <button
        type="button"
        aria-pressed={appearance === option}
        class={cn(
          'flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs transition-colors',
          appearance === option
            ? 'bg-card font-medium text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onclick={() => onAppearanceChange(option)}
      >
        <view.icon class="size-3.5" />
        {t(view.label)}
      </button>
    {/each}
  </div>
  <div class="mx-0.5 h-5 w-px bg-border"></div>
  <Button variant="ghost" size="sm" class="h-7" onclick={onArrange}>
    <LayoutGridIcon class="size-4" />
    {t(blueprintMessages.arrange)}
  </Button>
</Panel>
