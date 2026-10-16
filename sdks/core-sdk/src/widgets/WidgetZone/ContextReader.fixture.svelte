<script lang="ts">
  import { getContext } from 'svelte';
  import { OWNER_CONTEXT_KEY } from './widget-zone.fixtures.ts';

  let { context: _context }: { context?: unknown } = $props();

  const value = getContext<string | undefined>(OWNER_CONTEXT_KEY);
</script>

<span data-testid="context-reader">{value ?? 'no context'}</span>
