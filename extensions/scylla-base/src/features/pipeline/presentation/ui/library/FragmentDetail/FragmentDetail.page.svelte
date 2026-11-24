<script lang="ts">
  import { ErrorState } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { latestVersion } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { sourceReference } from '@base/features/pipeline/presentation/presenters/fragment-community.presenter.ts';
  import CompareDialog from './CompareDialog.svelte';
  import DeleteFragmentZone from './DeleteFragmentZone.svelte';
  import ForkUpstreamCard from './ForkUpstreamCard.svelte';
  import FragmentHeader from './FragmentHeader.svelte';
  import FragmentNodes from './FragmentNodes.svelte';
  import FragmentParameters from './FragmentParameters.svelte';
  import FragmentUsages from './FragmentUsages.svelte';
  import FragmentVersions from './FragmentVersions.svelte';
  import PipelinePickerDialog from './PipelinePickerDialog.svelte';
  import PublicationCard from './PublicationCard.svelte';
  import PublishDialog from './PublishDialog.svelte';
  import SourceNotice from './SourceNotice.svelte';
  import UpstreamUpdateCard from './UpstreamUpdateCard.svelte';
  import { setFragmentCrumbName } from '@base/features/pipeline/presentation/fragment-crumb.state.svelte.ts';
  import { createFragmentDetail } from './fragment-detail.state.svelte.ts';
  import { createFragmentEdit } from './fragment-edit.state.svelte.ts';

  interface Props {
    fragmentId?: string;
  }

  let { fragmentId }: Props = $props();

  const detail = createFragmentDetail(() => fragmentId ?? '');
  const fragment = $derived(detail.fragment);
  $effect(() => {
    setFragmentCrumbName(fragment?.name || undefined);
    return () => setFragmentCrumbName(undefined);
  });
  const latest = $derived(fragment && latestVersion(fragment));
  const source = $derived(fragment?.source);
  const edit = createFragmentEdit({
    fragment: () => detail.fragment!,
    author: () => detail.me,
    editable: () => detail.canPublishVersion,
  });
</script>

{#if detail.query.isLoading}
  <Skeleton class="h-72 w-full rounded-xl" />
{:else if !fragment || !latest}
  <ErrorState message={t(libraryMessages.notFound)} />
{:else}
  <div class="flex min-h-full w-full flex-col gap-6 pb-20">
    <FragmentHeader {detail} />
    {#if detail.pending && source?.kind === 'linked'}
      <UpstreamUpdateCard {detail} pending={detail.pending} publisher={source.package.publisher} />
    {:else if detail.pending && source?.kind === 'forked'}
      <ForkUpstreamCard
        {detail}
        release={detail.pending}
        reference={sourceReference(fragment)}
        baseVersion={source.baseVersion}
      />
    {/if}
    {#if source?.kind === 'linked'}
      <SourceNotice reference={sourceReference(fragment)} workspace={detail.workspaceName} />
    {/if}
    <FragmentNodes nodes={latest.nodes} {edit} />
    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="flex min-w-0 flex-col gap-4">
        <FragmentParameters parameters={latest.parameters} />
        {#if fragment.publication}
          <PublicationCard {detail} publication={fragment.publication} />
        {/if}
        {#if detail.canDelete}
          <DeleteFragmentZone {detail} />
        {/if}
      </div>
      <div class="flex flex-col gap-4">
        <FragmentVersions {detail} />
        <FragmentUsages {fragment} />
      </div>
    </div>
  </div>

  <PublishDialog {detail} />
  <CompareDialog {detail} />
  <PipelinePickerDialog {detail} />
{/if}
