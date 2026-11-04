<script lang="ts">
  import type { Snippet } from 'svelte';
  import { navigateTo } from '@platform/context';
  import { routePathname } from '@scylla/core-sdk';
  import { hasSession, loginPathBackTo } from '@base/features/login';

  let { children }: { children: Snippet } = $props();

  /** `undefined` while the cookie is checked: nothing shows, and nothing redirects. */
  let authenticated = $state<boolean | undefined>(undefined);

  $effect(() => {
    routePathname();
    let current = true;
    void hasSession().then((valid) => {
      if (!current) return;
      authenticated = valid;
      if (!valid) navigateTo(loginPathBackTo(window.location), { replace: true });
    });
    return () => {
      current = false;
    };
  });
</script>

{#if authenticated}
  {@render children()}
{/if}
