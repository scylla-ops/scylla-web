<script lang="ts">
  import { counts } from './widget-zone.fixtures.ts';

  let { context: _context }: { context?: unknown } = $props();

  $effect(() => {
    counts.mounts++;
    return () => {
      counts.cleanups++;
    };
  });
</script>

<span data-testid="counting">counting</span>
