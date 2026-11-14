<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import type { RouteParams } from '@scylla/core-sdk';
  import { cleanContext, namePipeline } from './context-cleaner.effect.svelte.ts';

  let { params, children }: { params: RouteParams; children: Snippet } = $props();

  const project = cleanContext(untrack(() => params.projectId));
  namePipeline(untrack(() => params.pipelineId));
</script>

{#if !project.gone}
  {@render children()}
{/if}
