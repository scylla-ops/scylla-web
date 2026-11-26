<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { currentPathname, currentSearch } from '@platform/context';
  import type { RouteParams } from '@scylla/core-sdk';
  import { rememberWorkspacePage } from '@base/shell/presentation/layout/admin-exit.state.svelte.ts';
  import { malformedIdParams } from '@shared/utils/id.ts';
  import NotFoundPage from './NotFound/NotFound.page.svelte';
  import { syncWorkspace } from './workspace-sync.effect.svelte.ts';

  let { params, children }: { params: RouteParams; children: Snippet } = $props();

  const slug = untrack(() => params.workspaceSlug);
  const workspace = syncWorkspace(slug);
  // The way back from the administration of the server.
  if (slug) rememberWorkspacePage(slug, `${currentPathname()}${currentSearch()}`);
</script>

<!-- An id with a wrong form names nothing: not found, and no request for the server to refuse. -->
{#if workspace.matched}
  {#if malformedIdParams(params).length > 0}
    <NotFoundPage />
  {:else}
    {@render children()}
  {/if}
{/if}
