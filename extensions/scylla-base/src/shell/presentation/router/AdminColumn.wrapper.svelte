<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { RouteParams } from '@scylla/core-sdk';
  import { malformedIdParams } from '@shared/utils/id.ts';
  import NotFoundPage from './NotFound/NotFound.page.svelte';

  let { params, children }: { params: RouteParams; children: Snippet } = $props();
</script>

<!-- The pages of the administration share one column. -->
<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col">
  {#if malformedIdParams(params).length > 0}
    <NotFoundPage />
  {:else}
    {@render children()}
  {/if}
</div>
