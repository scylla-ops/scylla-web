<script lang="ts">
  import { ListSkeleton } from '@scylla/ui';
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { secretMessages } from '@base/features/secret/presentation/messages/secret.messages.ts';
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
  <div class="flex min-h-full w-full shrink-0 flex-col gap-4 pb-20" data-tour="secrets">
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
      {:else if secrets.length === 0}
        <section
          class="flex min-h-60 flex-col items-center justify-center gap-2 rounded-xl border p-8 text-center"
        >
          <h2 class="text-xl">{t(secretMessages.emptyTitle)}</h2>
          <p class="max-w-md text-sm text-muted-foreground">{t(secretMessages.emptyBody)}</p>
        </section>
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
