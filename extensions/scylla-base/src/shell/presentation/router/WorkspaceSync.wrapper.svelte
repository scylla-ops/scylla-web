<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import type { RouteParams } from '@scylla/core-sdk';
  import { syncWorkspace } from './workspace-sync.effect.svelte.ts';

  let { params, children }: { params: RouteParams; children: Snippet } = $props();

  syncWorkspace(untrack(() => params.workspaceSlug));
</script>

{@render children()}
