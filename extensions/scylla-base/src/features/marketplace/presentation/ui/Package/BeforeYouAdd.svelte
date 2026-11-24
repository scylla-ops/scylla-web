<script lang="ts">
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import NetworkIcon from '@lucide/svelte/icons/network';
  import WrenchIcon from '@lucide/svelte/icons/wrench';
  import { Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    latestPackageVersion,
    type MarketPackage,
  } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import { secretKeys } from '@base/features/marketplace/presentation/presenters/package.presenter.ts';

  let { pkg }: { pkg: MarketPackage } = $props();

  /** The secrets of the latest version first, then what the agent needs. */
  const rows = $derived([
    ...secretKeys(latestPackageVersion(pkg)).map(key => ({
      icon: KeyRoundIcon,
      name: key,
      detail: t(marketplaceMessages.secretRequirement),
      tag: t(marketplaceMessages.secretTag),
    })),
    ...pkg.requirements.map(requirement =>
      requirement.kind === 'agent'
        ? {
            icon: WrenchIcon,
            name: requirement.tool,
            detail: t(marketplaceMessages.agentRequirement),
            tag: t(marketplaceMessages.agentTag),
          }
        : {
            icon: NetworkIcon,
            name: t(marketplaceMessages.networkRequirement),
            detail: requirement.reaches,
            tag: t(marketplaceMessages.networkTag),
          },
    ),
  ]);
</script>

<Card class="flex flex-col gap-3 p-4">
  <h2>{t(marketplaceMessages.beforeYouAdd)}</h2>
  {#if rows.length}
    <ul class="flex flex-col gap-3">
      {#each rows as row, index (index)}
        <li class="flex items-center gap-2.5 text-xs">
          <row.icon class="size-3.5 shrink-0 text-muted-foreground" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium">{row.name}</span>
            <span class="block truncate text-muted-foreground">{row.detail}</span>
          </span>
          <span class="rounded-full border px-2 py-0.5 font-mono">{row.tag}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-xs text-muted-foreground">{t(marketplaceMessages.nothingRequired)}</p>
  {/if}
</Card>
