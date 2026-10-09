<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { RoutePermission } from '@scylla/core-sdk';
  import { granted } from '../../../__test__/test-permission.fixture.ts';

  let { permission, children }: { permission: RoutePermission; children: Snippet } = $props();
</script>

{#if granted.has(permission)}
  {@render children()}
{:else}
  <p data-testid="denied">denied</p>
{/if}
