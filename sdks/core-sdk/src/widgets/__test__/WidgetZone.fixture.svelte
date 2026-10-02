<script lang="ts">
  import type { ZonePoint } from '../widget-points.struct.ts';

  interface Props {
    point: ZonePoint<{ show: boolean }>;
    context: { show: boolean };
  }

  let { point, context }: Props = $props();
</script>

<div data-testid="zone" use:point={context}>
  <span data-testid="default-content">default content</span>
</div>
