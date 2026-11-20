<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import { Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { VersionBadge } from '@base/features/pipeline';
  import {
    latestPackageVersion,
    type MarketPackage,
  } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import { compactCount } from '@base/features/marketplace/presentation/presenters/package.presenter.ts';

  interface Props {
    pkg: MarketPackage;
    /** The latest versions only. */
    limit?: number;
  }

  let { pkg, limit }: Props = $props();

  const latest = $derived(latestPackageVersion(pkg).number);
  const shown = $derived([...pkg.versions].reverse().slice(0, limit));
</script>

<Card class="flex flex-col gap-4 p-4">
  <h2>{t(marketplaceMessages.versions)}</h2>
  <ol class="flex flex-col gap-3.5">
    {#each shown as version (version.number)}
      {@const deprecated = pkg.deprecated.includes(version.number)}
      <li class={cn('flex items-start gap-2.5 text-xs', deprecated && 'opacity-60')}>
        <span class="mt-px"><VersionBadge number={version.number} filled={version.number === latest} /></span>
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-baseline gap-x-1.5">
            <span class="font-medium text-foreground">{version.author.name}</span>
            <span class="text-muted-foreground">· {getRelativeTime(version.publishedAt)}</span>
            <span class="text-muted-foreground">
              · {t(marketplaceMessages.versionInstalls(compactCount(version.installs)))}
            </span>
            {#if deprecated}
              <span class="rounded-full border border-destructive/40 px-1.5 text-[10.5px] text-destructive">
                {t(marketplaceMessages.deprecated)}
              </span>
            {/if}
          </p>
          {#each version.changes as change (change)}
            <p class="text-muted-foreground">{change}</p>
          {/each}
        </div>
      </li>
    {/each}
  </ol>
  <p class="flex gap-2 rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
    <CircleCheckIcon class="mt-px size-3.5 shrink-0" />
    {t(marketplaceMessages.immutableVersions)}
  </p>
</Card>
