<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { currentPathname, currentSearch } from '@platform/context';
  import type { RouteParams } from '@scylla/core-sdk';
  import { rememberWorkspacePage } from '@base/shell/presentation/layout/admin-exit.state.svelte.ts';
  import { syncWorkspace } from './workspace-sync.effect.svelte.ts';

  let { params, children }: { params: RouteParams; children: Snippet } = $props();

  const slug = untrack(() => params.workspaceSlug);
  const workspace = syncWorkspace(slug);
  // The way back from the administration of the server.
  if (slug) rememberWorkspacePage(slug, `${currentPathname()}${currentSearch()}`);
</script>

{#if workspace.matched}
  {@render children()}
{/if}
