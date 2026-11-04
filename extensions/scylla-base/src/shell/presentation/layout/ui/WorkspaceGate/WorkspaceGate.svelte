<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ScyllaLoadingScreen } from '@scylla/ui';
  import { createShell } from '@base/shell/presentation/layout/shell.state.svelte.ts';
  import FirstWorkspace from './FirstWorkspace.svelte';

  let { children }: { children: Snippet } = $props();

  const shell = createShell();
</script>

{#if shell.isLoading}
  <ScyllaLoadingScreen />
{:else if !shell.hasWorkspaces}
  <FirstWorkspace isPending={shell.isCreating} onSubmit={shell.createFirstWorkspace} />
{:else}
  {@render children()}
{/if}
