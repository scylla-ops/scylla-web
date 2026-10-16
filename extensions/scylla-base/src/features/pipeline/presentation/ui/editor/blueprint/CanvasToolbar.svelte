<script lang="ts">
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import { Panel } from '@xyflow/svelte';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    NODE_APPEARANCES,
    type NodeAppearance,
  } from '@base/features/pipeline/presentation/node-appearance.svelte.ts';
  import { blueprintMessages } from './blueprint.messages.ts';
  import { NODE_APPEARANCE_VIEWS } from './nodes/node-appearances.ts';
  import Segmented from './Segmented.svelte';

  interface Props {
    appearance: NodeAppearance;
    onAppearanceChange: (appearance: NodeAppearance) => void;
    onArrange: () => void;
  }

  let { appearance, onAppearanceChange, onArrange }: Props = $props();

  const options = $derived(
    NODE_APPEARANCES.map(value => ({
      value,
      label: t(NODE_APPEARANCE_VIEWS[value].label),
      icon: NODE_APPEARANCE_VIEWS[value].icon,
    })),
  );
</script>

<Panel
  position="top-right"
  class="m-3! flex items-center gap-1 rounded-[10px] border bg-card p-1 shadow-xs"
>
  <Segmented
    value={appearance}
    {options}
    label={t(blueprintMessages.nodeStyle)}
    onChange={onAppearanceChange}
  />
  <div class="mx-0.5 h-5 w-px bg-border"></div>
  <Button variant="ghost" size="sm" class="h-7" onclick={onArrange}>
    <LayoutGridIcon class="size-4" />
    {t(blueprintMessages.arrange)}
  </Button>
</Panel>
