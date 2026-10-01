<script lang="ts">
  import { widgetZone } from '../widget-zone.actions.svelte.ts';
  import type { ZoneBinding } from '../widget-points.struct.ts';

  interface Props {
    binding: ZoneBinding;
  }

  let { binding }: Props = $props();
</script>

<div data-testid="zone" use:widgetZone={binding}>
  <span data-testid="default-content">default content</span>
</div>
