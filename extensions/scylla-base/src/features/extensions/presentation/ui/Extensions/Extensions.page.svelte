<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { ErrorState, FeatureHeader } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { extensionQueries } from '../../extensions.queries.ts';
  import ExtensionCard from '../ExtensionCard.svelte';
  import { extensionsMessages } from '../extensions.messages.ts';

  const extensionsQuery = createQuery(() => extensionQueries.installed());
  const extensions = $derived(extensionsQuery.data ?? []);
</script>

{#if extensionsQuery.isError}
  <ErrorState message={t(extensionsMessages.loadError)} />
{:else}
  <div class="flex h-full w-full flex-col overflow-hidden">
    <div class="px-2 pt-2">
      <p class="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {t(extensionsMessages.platform)}
      </p>
      <FeatureHeader
        count={extensions.length}
        label={t(extensionsMessages.extension)}
        pluralLabel={t(extensionsMessages.extensions)}
      />
    </div>

    {#if extensionsQuery.isLoading}
      <div class="grid gap-3 p-2 sm:grid-cols-2 lg:grid-cols-3">
        {#each { length: 3 } as _, index (index)}
          <Skeleton class="h-32 w-full rounded-xl" />
        {/each}
      </div>
    {:else if extensions.length === 0}
      <p
        class="m-2 rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground"
      >
        {t(extensionsMessages.noExtensions)}
      </p>
    {:else}
      <div class="grid gap-3 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-3">
        {#each extensions as extension (extension.id)}
          <ExtensionCard {extension} />
        {/each}
      </div>
    {/if}
  </div>
{/if}
