<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ScyllaLoadingScreen } from '@scylla/ui';
  import { createShellState } from '../../shell.state.svelte.ts';
  import FirstOrganization from '../FirstOrganization.svelte';

  let { children }: { children: Snippet } = $props();

  const shell = createShellState();
</script>

{#if shell.isLoading}
  <ScyllaLoadingScreen />
{:else if !shell.hasOrganizations}
  <FirstOrganization isPending={shell.isCreating} onSubmit={shell.createFirstOrganization} />
{:else}
  {@render children()}
{/if}
