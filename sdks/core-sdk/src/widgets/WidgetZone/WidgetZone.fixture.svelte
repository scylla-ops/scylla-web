<script lang="ts">
  import { setContext } from 'svelte';
  import WidgetZone from './WidgetZone.svelte';
  import type { ZonePoint } from '../widget-points.struct.ts';
  import { OWNER_CONTEXT_KEY } from './widget-zone.fixtures.ts';

  interface Props {
    point: ZonePoint<{ show: boolean }>;
    context: { show: boolean };
  }

  let { point, context }: Props = $props();

  setContext(OWNER_CONTEXT_KEY, 'from the owner');
</script>

<div data-testid="zone">
  <WidgetZone {point} {context}>
    <span data-testid="default-content">default content</span>
  </WidgetZone>
</div>
