<script lang="ts">
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { Button, Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import {
    latestVersion,
    type FragmentVersion,
  } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { pinnedValues } from '@base/features/pipeline/domain/structs/fragment-upstream.struct.ts';
  import { versionDiff } from '@base/features/pipeline/domain/structs/version-diff.struct.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import VersionChanges from './VersionChanges.svelte';
  import type { FragmentDetail } from './fragment-detail.state.svelte.ts';

  interface Props {
    detail: FragmentDetail;
    /** The version of the publisher that waits. */
    pending: FragmentVersion;
    publisher: string;
  }

  let { detail, pending, publisher }: Props = $props();

  const fragment = $derived(detail.fragment!);
  const current = $derived(latestVersion(fragment));
  const changes = $derived(versionDiff(current, pending));
  const pins = $derived(pinnedValues(fragment.usages, current, pending));
  // One entry for each key and value: a value can hold an "=", so the pair stays two fields.
  const pinnedKeys = $derived(
    [...new Map(pins.map(pin => [JSON.stringify([pin.key, pin.value]), pin])).values()].map(
      ({ key, value }) => ({ key, value }),
    ),
  );
  const pinning = $derived(new Set(pins.map(pin => pin.usage.pipelineId)).size);
  const total = $derived(fragment.usages.length);
</script>

<!-- A linked fragment: the admin reads what the version changes for the workspace, then decides. -->
<Card class="flex flex-col gap-4 border-warning/50 bg-warning/10 p-4">
  <div class="flex flex-wrap items-center gap-2">
    <RefreshCwIcon class="size-4 text-warning" />
    <h2>{t(communityMessages.upstreamTitle(pending.number, publisher))}</h2>
    <span class="text-xs text-muted-foreground">
      {t(communityMessages.releasedOn(getRelativeTime(pending.publishedAt)))}
    </span>
    <Button
      size="xs"
      variant="ghost"
      class="ml-auto text-primary"
      onclick={() =>
        detail.compareUpstream(
          t(libraryMessages.version(current.number)),
          t(libraryMessages.version(pending.number)),
        )}
    >
      {t(communityMessages.compareVersions(current.number, pending.number))}
    </Button>
  </div>

  <div class="grid gap-4 text-sm md:grid-cols-2">
    <section class="flex flex-col gap-1.5">
      <h3 class="text-xs text-muted-foreground uppercase">{t(communityMessages.changesHeading)}</h3>
      <VersionChanges {changes} notes={pending.changes} />
      <p class="text-xs text-primary">✓ {t(communityMessages.valuesKept)}</p>
    </section>
    <section class="flex flex-col gap-1.5">
      <h3 class="text-xs text-muted-foreground uppercase">
        {t(communityMessages.impactHeading(detail.workspaceName))}
      </h3>
      <p>{t(communityMessages.canSwitch(total - pinning, total))}</p>
      {#each pinnedKeys as { key, value } (`${key}\u0000${value}`)}
        {@const names = pins.filter(pin => pin.key === key && pin.value === value).map(pin => pin.usage.pipelineName)}
        <p class="text-destructive">{t(communityMessages.pinned(names.length, key, value, names.join(', ')))}</p>
      {/each}
    </section>
  </div>

  <div class="flex flex-wrap items-center gap-3 border-t border-warning/40 pt-3">
    <p class="flex-1 text-xs text-muted-foreground">
      {t(detail.canDecideUpstream ? communityMessages.acceptHint : communityMessages.adminOnlyHint)}
    </p>
    {#if detail.canDecideUpstream}
      <Button variant="outline" disabled={detail.busy} onclick={() => detail.skip(pending.number)}>
        {t(communityMessages.skip(pending.number))}
      </Button>
      <Button disabled={detail.busy} onclick={() => detail.accept(pending.number)}>
        {t(communityMessages.accept(pending.number))}
      </Button>
    {/if}
  </div>
</Card>
