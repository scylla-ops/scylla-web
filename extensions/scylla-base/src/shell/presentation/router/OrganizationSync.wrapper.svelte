<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import type { RouteParams } from '@scylla/core-sdk';
  import { syncOrganization } from './organization-sync.effect.svelte.ts';

  let { params, children }: { params: RouteParams; children: Snippet } = $props();

  syncOrganization(untrack(() => params.organizationSlug));
</script>

{@render children()}
