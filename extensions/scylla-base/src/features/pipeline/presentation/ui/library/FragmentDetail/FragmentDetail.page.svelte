<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { ErrorState } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { toRune } from '@scylla/ui/stores';
  import { contextStore } from '@platform/context';
  import { latestVersion } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { fragmentQueries } from '@base/features/pipeline/presentation/fragment.queries.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import FragmentHeader from './FragmentHeader.svelte';
  import FragmentNodes from './FragmentNodes.svelte';
  import FragmentParameters from './FragmentParameters.svelte';
  import FragmentUsages from './FragmentUsages.svelte';
  import FragmentVersions from './FragmentVersions.svelte';

  interface Props {
    fragmentId?: string;
  }

  let { fragmentId }: Props = $props();

  const context = toRune(contextStore);
  const fragmentQuery = createQuery(() =>
    fragmentQueries.byId(context().workspace.id, fragmentId ?? ''),
  );
  const fragment = $derived(fragmentQuery.data);
  const latest = $derived(fragment && latestVersion(fragment));
</script>

{#if fragmentQuery.isLoading}
  <Skeleton class="h-72 w-full rounded-xl" />
{:else if !fragment || !latest}
  <ErrorState message={t(libraryMessages.notFound)} />
{:else}
  <div class="flex min-h-full w-full flex-col gap-6 pb-20">
    <FragmentHeader {fragment} />
    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="flex min-w-0 flex-col gap-4">
        <FragmentNodes nodes={latest.nodes} />
        <FragmentParameters parameters={latest.parameters} />
      </div>
      <div class="flex flex-col gap-4">
        <FragmentVersions {fragment} />
        <FragmentUsages {fragment} />
      </div>
    </div>
  </div>
{/if}
