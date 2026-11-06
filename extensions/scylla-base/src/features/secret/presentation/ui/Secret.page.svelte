<script lang="ts">
  import { ListSkeleton } from '@scylla/ui';
  import { createQuery } from '@scylla/core-sdk';
  import { secretQueries } from '../secret.queries.ts';
  import CreateSecretDialog from './CreateSecretDialog/CreateSecretDialog.svelte';
  import SecretHeader from './components/SecretHeader.svelte';
  import SecretList from './components/SecretList/SecretList.svelte';

  interface Props {
    projectId?: string;
  }

  let { projectId }: Props = $props();

  // The children need a defined id, so the page still checks it.
  const secretsQuery = createQuery(() => secretQueries.byProject(projectId ?? ''));
  const secrets = $derived(secretsQuery.data ?? []);

  let isCreateDialogOpen = $state(false);
</script>

{#if projectId}
  <div class="flex min-h-full w-full flex-col gap-4" data-tour="secrets">
    <SecretHeader
      {projectId}
      activeCount={secretsQuery.isLoading ? undefined : secrets.length}
      secretIds={secrets.map(secret => secret.id)}
      onAddSecret={() => (isCreateDialogOpen = true)}
    />
    <div class="overflow-hidden">
      {#if secretsQuery.isLoading}
        <!-- The rows of the secrets table. -->
        <ListSkeleton rows={4} rowClass="h-12 w-full" />
      {:else}
        <SecretList {secrets} {projectId} />
      {/if}
      <CreateSecretDialog
        {projectId}
        open={isCreateDialogOpen}
        setOpen={next => (isCreateDialogOpen = next)}
      />
    </div>
  </div>
{/if}
