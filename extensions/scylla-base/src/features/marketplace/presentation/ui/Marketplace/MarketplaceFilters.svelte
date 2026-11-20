<script lang="ts">
  import { Switch } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { categoryName, MARKETPLACE_CATEGORIES } from '@base/features/pipeline';
  import { PACKAGE_STACKS } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import { STACK_NAMES } from '@base/features/marketplace/presentation/presenters/package.presenter.ts';
  import FacetOption from './FacetOption.svelte';
  import type { Marketplace } from './marketplace.state.svelte.ts';

  let { marketplace }: { marketplace: Marketplace } = $props();

  const filter = $derived(marketplace.filter);
  const facets = $derived(marketplace.facets);
</script>

<!-- The checkboxes of a facet add up; the counts say what each one keeps within the search. -->
<aside class="flex flex-col gap-5 text-sm">
  <section class="flex flex-col gap-2">
    <h3 class="text-xs text-muted-foreground uppercase">{t(marketplaceMessages.publisherHeading)}</h3>
    <label class="flex items-center gap-2">
      <span class="flex-1">{t(marketplaceMessages.verifiedOnly)}</span>
      <Switch
        checked={filter.verifiedOnly}
        onCheckedChange={checked => (marketplace.verifiedOnly = checked)}
      />
    </label>
    <FacetOption
      label={t(marketplaceMessages.officialOnly)}
      count={facets.official}
      checked={filter.officialOnly}
      onToggle={() => (marketplace.officialOnly = !filter.officialOnly)}
    />
  </section>

  <section class="flex flex-col gap-2">
    <h3 class="text-xs text-muted-foreground uppercase">{t(marketplaceMessages.categoryHeading)}</h3>
    {#each MARKETPLACE_CATEGORIES as category (category)}
      <FacetOption
        label={t(categoryName(category))}
        count={facets.categories[category] ?? 0}
        checked={filter.categories.includes(category)}
        onToggle={() => marketplace.toggleCategory(category)}
      />
    {/each}
  </section>

  <section class="flex flex-col gap-2">
    <h3 class="text-xs text-muted-foreground uppercase">{t(marketplaceMessages.stackHeading)}</h3>
    {#each PACKAGE_STACKS as stack (stack)}
      <FacetOption
        label={STACK_NAMES[stack]}
        count={facets.stacks[stack] ?? 0}
        checked={filter.stacks.includes(stack)}
        onToggle={() => marketplace.toggleStack(stack)}
      />
    {/each}
  </section>

  <p class="text-xs text-muted-foreground">{t(marketplaceMessages.runsOnYourAgents)}</p>
</aside>
