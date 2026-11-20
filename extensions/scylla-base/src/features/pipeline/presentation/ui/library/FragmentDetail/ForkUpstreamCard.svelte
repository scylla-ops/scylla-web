<script lang="ts">
  import StoreIcon from '@lucide/svelte/icons/store';
  import { Button, Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import {
    latestVersion,
    type FragmentVersion,
  } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import type { FragmentDetail } from './fragment-detail.state.svelte.ts';

  interface Props {
    detail: FragmentDetail;
    /** The release of the publisher after the base of the fork. */
    release: FragmentVersion;
    reference: string;
    baseVersion: number;
  }

  let { detail, release, reference, baseVersion }: Props = $props();

  const fragment = $derived(detail.fragment!);
</script>

<!-- A fork: the release of the publisher is information. Nothing changes until someone acts. -->
<Card class="flex flex-col gap-2 bg-muted/60 p-4">
  <div class="flex flex-wrap items-center gap-2">
    <StoreIcon class="size-4 text-muted-foreground" />
    <h2>{t(communityMessages.forkUpstreamTitle(reference, release.number))}</h2>
    <span class="text-xs text-muted-foreground">{formatDay(release.publishedAt)}</span>
    <Button
      size="xs"
      variant="ghost"
      class="ml-auto text-primary"
      onclick={() =>
        detail.compareUpstream(
          t(libraryMessages.version(latestVersion(fragment).number)),
          `${reference} v${release.number}`,
        )}
    >
      {t(communityMessages.compareVersions(baseVersion, release.number))}
    </Button>
  </div>
  <div class="flex flex-wrap items-center gap-3">
    <p class="flex-1 text-xs text-muted-foreground">
      {release.changes.join(' ')}
      {t(communityMessages.forkUpstreamHint)}
    </p>
    {#if detail.canPublishVersion}
      <Button variant="ghost" size="sm" disabled={detail.busy} onclick={() => detail.dismiss()}>
        {t(communityMessages.dismiss)}
      </Button>
      <Button variant="outline" size="sm" disabled={detail.busy} onclick={() => detail.forkUpstream()}>
        {t(communityMessages.newForkFrom(release.number))}
      </Button>
    {/if}
  </div>
</Card>
