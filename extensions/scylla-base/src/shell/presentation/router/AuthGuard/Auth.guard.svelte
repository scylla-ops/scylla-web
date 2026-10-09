<script lang="ts">
  import type { Snippet } from 'svelte';
  import { navigateTo } from '@platform/context';
  import { routePathname } from '@scylla/core-sdk';
  import { hasSession } from '@base/features/login';

  let { children }: { children: Snippet } = $props();

  const authenticated = $derived((routePathname(), hasSession()));

  $effect(() => {
    if (!authenticated) navigateTo('/login', { replace: true });
  });
</script>

{#if authenticated}
  {@render children()}
{/if}
