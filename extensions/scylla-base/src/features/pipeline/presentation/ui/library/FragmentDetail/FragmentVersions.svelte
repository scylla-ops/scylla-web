<script lang="ts">
  import InfoIcon from '@lucide/svelte/icons/info';
  import { Button, Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import {
    versionRows,
    type VersionRow,
  } from '@base/features/pipeline/presentation/presenters/fragment-community.presenter.ts';
  import VersionBadge from '../VersionBadge.svelte';
  import type { FragmentDetail } from './fragment-detail.state.svelte.ts';

  let { detail }: { detail: FragmentDetail } = $props();

  const fragment = $derived(detail.fragment!);
  const rows = $derived(versionRows(fragment));
  const next = $derived((fragment.versions.at(-1)?.number ?? 0) + 1);
  const kind = $derived(fragment.source?.kind);

  /** What the row says after the author, besides its date. */
  const stateNote = (row: VersionRow): string => {
    switch (row.state) {
      case 'pending':
        return t(communityMessages.versionNotInLibrary);
      case 'skipped':
        return t(communityMessages.versionSkipped);
      case 'base':
        return t(communityMessages.versionBase);
      case 'library':
        return t(libraryMessages.versionUsage(row.pipelines));
    }
  };

  const visibilityNote = (row: VersionRow): string | null => {
    switch (row.visibility) {
      case 'public':
        return t(communityMessages.versionPublic);
      case 'private':
        return t(communityMessages.versionPrivate(detail.workspaceName));
      case 'deprecated':
        return t(communityMessages.versionDeprecated);
      case null:
        return null;
    }
  };

  const policy = $derived.by(() => {
    if (kind === 'linked') return communityMessages.linkedPolicy(detail.workspaceName);
    if (fragment.publication) return communityMessages.privateFirstPolicy(detail.workspaceName);
    if (kind === 'forked') return communityMessages.forkPolicy(fragment.author.name, detail.workspaceName);
    return libraryMessages.publishPolicy(fragment.author.name);
  });
</script>

<Card class="flex flex-col gap-4 p-4">
  <div class="flex items-center gap-2">
    <h2 class="flex-1">{t(libraryMessages.versions)}</h2>
    {#if detail.canPublishVersion}
      <Button size="xs" variant="outline" onclick={() => (detail.picker = 'publish')}>
        {t(communityMessages.publishNext(next))}
      </Button>
    {/if}
  </div>

  <ol class="flex flex-col gap-3.5">
    {#each rows as row (`${row.state}-${row.number}`)}
      {@const visibility = visibilityNote(row)}
      <li class={cn('flex items-start gap-2.5 text-xs', row.state === 'skipped' && 'opacity-60')}>
        <span class="mt-px"><VersionBadge number={row.number} filled={row.latest} /></span>
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-baseline gap-x-1.5">
            <span class="font-medium text-foreground">{row.author.name}</span>
            {#if row.publishedAt}
              <span class="text-muted-foreground">· {getRelativeTime(row.publishedAt)}</span>
            {/if}
            <span class={cn(row.state === 'pending' ? 'text-warning' : 'text-muted-foreground')}>
              · {stateNote(row)}
            </span>
            {#if visibility}
              <span
                class={cn(
                  'rounded-full border px-1.5 text-[10.5px]',
                  row.visibility === 'public' && 'border-primary/40 text-primary',
                  row.visibility === 'deprecated' && 'border-destructive/40 text-destructive',
                )}
              >
                {visibility}
              </span>
            {/if}
          </p>
          {#each row.changes as change (change)}
            <p class="text-muted-foreground">{change}</p>
          {/each}
          {#if row.visibility === 'private' && detail.canPublishToMarketplace}
            <Button
              size="xs"
              variant="ghost"
              class="-ml-2 text-primary"
              onclick={() => (detail.publishing = row.number)}
            >
              {t(communityMessages.makePublic(row.number))}
            </Button>
          {/if}
        </div>
      </li>
    {/each}
  </ol>

  <p class="flex gap-2 rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
    <InfoIcon class="mt-px size-3.5 shrink-0" />
    {t(policy)}
  </p>
</Card>
