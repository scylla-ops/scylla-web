<script lang="ts">
  import GitForkIcon from '@lucide/svelte/icons/git-fork';
  import LibraryBigIcon from '@lucide/svelte/icons/library-big';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import StarIcon from '@lucide/svelte/icons/star';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { FragmentIcon, VersionBadge } from '@base/features/pipeline';
  import { latestPackageVersion } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import { compactCount } from '@base/features/marketplace/presentation/presenters/package.presenter.ts';
  import type { PackagePage } from './package-page.state.svelte.ts';

  let { page }: { page: PackagePage } = $props();

  const pkg = $derived(page.pkg!);
  const publisherBadge = $derived(
    pkg.publisher.official
      ? marketplaceMessages.official
      : pkg.publisher.verified
        ? marketplaceMessages.verifiedPublisher
        : null,
  );
  const stars = $derived(compactCount(pkg.stars));
</script>

<header class="flex flex-wrap items-start gap-4">
  <FragmentIcon class="size-12 [&>svg]:size-6" />
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <div class="flex items-center gap-2">
      <h1 class="truncate">{pkg.name}</h1>
      <VersionBadge number={latestPackageVersion(pkg).number} filled />
      {#if publisherBadge}
        <span class="rounded-full border px-2 py-0.5 text-xs font-medium">{t(publisherBadge)}</span>
      {/if}
    </div>
    <p class="text-sm text-muted-foreground">
      {pkg.description} · {t(marketplaceMessages.byPublisher(pkg.publisher.handle))}
    </p>
  </div>
  <div class="flex shrink-0 flex-wrap items-center gap-2">
    <Button
      variant="outline"
      aria-pressed={pkg.starred}
      disabled={!page.canStar}
      onclick={() => page.toggleStar()}
    >
      <StarIcon class={cn('size-4', pkg.starred && 'fill-current text-warning')} />
      {t(pkg.starred ? marketplaceMessages.starred(stars) : marketplaceMessages.star(stars))}
    </Button>
    {#if page.canAdd}
      <Button variant="outline" onclick={() => (page.adding = 'forked')}>
        <GitForkIcon class="size-4" />
        {t(marketplaceMessages.fork)}
      </Button>
      <Button onclick={() => (page.adding = 'linked')}>
        <PlusIcon class="size-4" />
        {t(marketplaceMessages.addToLibrary)}
      </Button>
    {:else if page.status.kind !== 'none'}
      <Button onclick={() => page.openInLibrary()}>
        <LibraryBigIcon class="size-4" />
        {t(marketplaceMessages.openInLibrary)}
      </Button>
    {/if}
  </div>
</header>
