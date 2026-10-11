<script lang="ts">
  import { untrack } from 'svelte';
  import type { ZonePoint } from '../widget-points.struct.ts';

  interface Props {
    point: ZonePoint<{ show: boolean }>;
    context: { show: boolean };
  }

  let { point, context }: Props = $props();

  // An owner opens its zone with a module constant. A test gives the point as a prop, and
  // `rerender` replaces every prop: read it once, as the constant would be.
  const zone = untrack(() => point)(() => context);
</script>

<div data-testid="zone" {@attach zone}>
  <span data-testid="default-content">default content</span>
</div>
