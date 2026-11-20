<script lang="ts">
  import GitForkIcon from '@lucide/svelte/icons/git-fork';
  import GlobeIcon from '@lucide/svelte/icons/globe';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { scyllaNavigate } from '@platform/context';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { latestVersion } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import {
    marketplacePackageId,
    publicName,
  } from '@base/features/pipeline/domain/structs/fragment-publication.struct.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { sourceReference } from '@base/features/pipeline/presentation/presenters/fragment-community.presenter.ts';
  import FragmentIcon from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/FragmentIcon.svelte';
  import FavoriteButton from '../FavoriteButton.svelte';
  import VersionBadge from '../VersionBadge.svelte';
  import type { FragmentDetail } from './fragment-detail.state.svelte.ts';

  interface Props {
    detail: FragmentDetail;
  }

  let { detail }: Props = $props();

  const fragment = $derived(detail.fragment!);
  const source = $derived(fragment.source);
  // A public fragment has its own page; a fork that is not public points to its publisher.
  const packageId = $derived(
    fragment.publication
      ? marketplacePackageId(detail.scope, fragment.publication.name)
      : (source?.package.packageId ?? null),
  );

  const badge = $derived.by(() => {
    if (source?.kind === 'linked') return communityMessages.linkedBadge(source.package.publisher);
    if (source?.kind === 'forked') return communityMessages.forkBadge(sourceReference(fragment), source.baseVersion);
    if (fragment.publication) return communityMessages.publicBadge(publicName(detail.scope, fragment.publication.name));
    return communityMessages.organizationBadge;
  });
  const byline = $derived(
    source?.kind === 'linked'
      ? communityMessages.linkedToSubtitle(source.package.publisher)
      : libraryMessages.byAuthor(fragment.author.name),
  );
</script>

<header class="flex flex-wrap items-start gap-4">
  <FragmentIcon forked={source?.kind === 'forked'} class="size-12 [&>svg]:size-6" />
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <div class="flex items-center gap-2">
      <h1 class="truncate">{fragment.name}</h1>
      <VersionBadge number={latestVersion(fragment).number} filled />
      <span class="rounded-full border px-2 py-0.5 text-xs font-medium">{t(badge)}</span>
    </div>
    <p class="text-sm text-muted-foreground">{fragment.description} · {t(byline)}</p>
  </div>
  <div class="flex shrink-0 flex-wrap items-center gap-2">
    {#if source?.kind !== 'linked'}
      <FavoriteButton {fragment} labelled />
    {/if}
    {#if packageId}
      <Button variant="outline" onclick={() => scyllaNavigate.goToWorkspaceRoute(`marketplace/${packageId}`)}>
        <GlobeIcon class="size-4" />
        {t(communityMessages.viewOnMarketplace)}
      </Button>
    {:else if detail.canPublishToMarketplace}
      <Button variant="outline" onclick={() => (detail.publishing = latestVersion(fragment).number)}>
        <GlobeIcon class="size-4" />
        {t(communityMessages.publishToMarketplace)}
      </Button>
    {/if}
    {#if source?.kind === 'linked' && detail.canDecideUpstream}
      <Button variant="outline" disabled={detail.busy} onclick={() => detail.detach()}>
        <GitForkIcon class="size-4" />
        {t(communityMessages.detachAsFork)}
      </Button>
    {/if}
    {#if source?.kind === 'forked' && detail.pending}
      <Button
        variant="outline"
        onclick={() =>
          detail.compareUpstream(
            t(libraryMessages.version(latestVersion(fragment).number)),
            `${sourceReference(fragment)} v${detail.pending!.number}`,
          )}
      >
        <GitForkIcon class="size-4" />
        {t(communityMessages.compareWithUpstream)}
      </Button>
    {/if}
    <Button onclick={() => (detail.picker = 'use')}>
      <PlusIcon class="size-4" />
      {t(communityMessages.useInPipeline)}
    </Button>
  </div>
</header>
