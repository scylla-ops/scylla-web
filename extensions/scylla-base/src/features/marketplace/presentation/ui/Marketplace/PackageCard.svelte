<script lang="ts">
  import StarIcon from '@lucide/svelte/icons/star';
  import { scyllaNavigate } from '@platform/context';
  import { Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { FragmentIcon, VersionBadge } from '@base/features/pipeline';
  import {
    latestPackageVersion,
    type MarketPackage,
  } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import {
    cardBadge,
    type LibraryStatus,
  } from '@base/features/marketplace/presentation/presenters/library-status.presenter.ts';
  import {
    compactCount,
    stepsLine,
  } from '@base/features/marketplace/presentation/presenters/package.presenter.ts';
  import PublisherLine from '../PublisherLine.svelte';

  interface Props {
    pkg: MarketPackage;
    status: LibraryStatus;
  }

  let { pkg, status }: Props = $props();

  const latest = $derived(latestPackageVersion(pkg));
  const badge = $derived(cardBadge(pkg, status));
  const badgeText = $derived.by(() => {
    switch (badge?.kind) {
      case 'in-library':
        return badge.version
          ? t(marketplaceMessages.inLibraryVersion(badge.version))
          : t(marketplaceMessages.inLibrary);
      case 'official':
        return t(marketplaceMessages.official);
      case 'own':
        return `@${pkg.publisher.handle}`;
      case 'new':
        return t(marketplaceMessages.new);
      default:
        return null;
    }
  });

  const href = $derived(`marketplace/${pkg.id}`);
  const open = () => scyllaNavigate.goToWorkspaceRoute(href);
</script>

<Card
  data-package-id={pkg.id}
  class="group flex h-full cursor-pointer flex-col gap-3 p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-lg"
  onclick={open}
>
  <div class="flex items-center gap-2.5">
    <FragmentIcon />
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- The name is the link: a keyboard reaches each package. -->
      <a
        {href}
        class="min-w-0 truncate font-semibold focus-visible:underline focus-visible:outline-none"
        onclick={event => {
          event.preventDefault();
          event.stopPropagation();
          open();
        }}
      >
        {pkg.name}
      </a>
      <PublisherLine publisher={pkg.publisher} />
    </div>
    <VersionBadge number={latest.number} filled />
  </div>
  <p class="line-clamp-2 min-h-10 text-sm text-muted-foreground">{pkg.description}</p>
  <p class="truncate rounded-md bg-muted px-2 py-1 font-mono text-xs">{stepsLine(latest)}</p>
  <div class="mt-auto flex items-center gap-3 text-xs">
    <span class="flex items-center gap-1" title={t(marketplaceMessages.stars(compactCount(pkg.stars)))}>
      <StarIcon class="size-3.5 text-muted-foreground" />
      {compactCount(pkg.stars)}
    </span>
    {#if badgeText}
      <span class="ml-auto rounded-full border px-2 py-0.5 font-medium">{badgeText}</span>
    {:else}
      <span class="ml-auto truncate text-muted-foreground">
        {t(marketplaceMessages.updated(getRelativeTime(latest.publishedAt)))}
      </span>
    {/if}
  </div>
</Card>
