<script lang="ts">
  import UploadIcon from '@lucide/svelte/icons/upload';
  import { scyllaNavigate } from '@platform/context';
  import {
    Button,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import {
    PACKAGE_ORDERS,
    type PackageOrder,
  } from '@base/features/marketplace/presentation/presenters/package-filter.presenter.ts';
  import type { Marketplace } from './marketplace.state.svelte.ts';

  let { marketplace }: { marketplace: Marketplace } = $props();
</script>

<header class="flex flex-wrap items-start gap-3">
  <div class="mr-auto flex flex-col gap-1">
    <h1>{t(marketplaceMessages.title)}</h1>
    <p class="text-sm text-muted-foreground">{t(marketplaceMessages.subtitle)}</p>
  </div>
  <Input
    type="search"
    value={marketplace.filter.query}
    oninput={event => (marketplace.query = event.currentTarget.value)}
    placeholder={t(marketplaceMessages.search)}
    aria-label={t(marketplaceMessages.search)}
    class="w-72 bg-background"
  />
  <Select
    type="single"
    value={marketplace.filter.order}
    onValueChange={value => (marketplace.order = value as PackageOrder)}
  >
    <SelectTrigger aria-label={t(marketplaceMessages.sortBy)} class="w-44 bg-background">
      {t(marketplaceMessages.orders[marketplace.filter.order])}
    </SelectTrigger>
    <SelectContent>
      {#each PACKAGE_ORDERS as order (order)}
        <SelectItem value={order} label={t(marketplaceMessages.orders[order])}>
          {t(marketplaceMessages.orders[order])}
        </SelectItem>
      {/each}
    </SelectContent>
  </Select>
  <!-- A fragment goes public from its page in the library, where its checks run. -->
  <Button variant="outline" onclick={() => scyllaNavigate.goToWorkspaceRoute('library')}>
    <UploadIcon class="size-4" />
    {t(marketplaceMessages.publishFragment)}
  </Button>
</header>
