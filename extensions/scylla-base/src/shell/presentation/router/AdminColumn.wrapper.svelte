<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { RouteParams } from '@scylla/core-sdk';

  let { children }: { params: RouteParams; children: Snippet } = $props();
</script>

<!-- The pages of the administration share one column. -->
<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col">
  {@render children()}
</div>
