<script lang="ts">
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import SquareDashedMousePointerIcon from '@lucide/svelte/icons/square-dashed-mouse-pointer';
  import { Panel } from '@xyflow/svelte';
  import { SegmentedControl } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    NODE_APPEARANCES,
    type NodeAppearance,
  } from './node-appearance-preference.state.svelte.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
  import { NODE_APPEARANCE_VIEWS } from './nodes/node-appearances.registry.ts';

  interface Props {
    appearance: NodeAppearance;
    onAppearanceChange: (appearance: NodeAppearance) => void;
    onArrange: () => void;
    /** Undefined: the canvas is read-only, and has no selection. */
    selectMode?: boolean;
    onSelectModeChange?: (selectMode: boolean) => void;
  }

  let { appearance, onAppearanceChange, onArrange, selectMode, onSelectModeChange }: Props =
    $props();

  const options = $derived(
    NODE_APPEARANCES.map(value => ({
      value,
      label: t(NODE_APPEARANCE_VIEWS[value].label),
      icon: NODE_APPEARANCE_VIEWS[value].icon,
    })),
  );
</script>

<!-- A canvas pane narrower than `md` (it is the container) shows Select and Arrange as icons only. -->
<Panel
  position="top-right"
  class="m-3! flex items-center gap-1 rounded-[10px] border bg-card p-1 shadow-xs"
>
  <SegmentedControl
    value={appearance}
    {options}
    aria-label={t(blueprintMessages.nodeStyle)}
    onChange={onAppearanceChange}
    size="sm"
  />
  <div class="mx-0.5 h-5 w-px bg-border"></div>
  {#if selectMode !== undefined}
    <Button
      variant={selectMode ? 'secondary' : 'ghost'}
      size="sm"
      class="h-7"
      aria-pressed={selectMode}
      title={t(blueprintMessages.selectModeHint)}
      onclick={() => onSelectModeChange?.(!selectMode)}
    >
      <SquareDashedMousePointerIcon class="size-4" />
      <span class="@max-md:sr-only">{t(blueprintMessages.selectMode)}</span>
    </Button>
  {/if}
  <Button
    variant="ghost"
    size="sm"
    class="h-7"
    title={t(blueprintMessages.arrange)}
    onclick={onArrange}
  >
    <LayoutGridIcon class="size-4" />
    <span class="@max-md:sr-only">{t(blueprintMessages.arrange)}</span>
  </Button>
</Panel>
