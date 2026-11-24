<script lang="ts">
  import type { Snippet } from 'svelte';
  import { currentPathname, type RoutePermission } from '@scylla/core-sdk';

  /** Opens no page: it tells on which pathname the router put a page. */
  let { permission: _permission }: { permission: RoutePermission; children: Snippet } = $props();

  const pathname = currentPathname();
</script>

<p data-testid="page">{pathname}</p>
