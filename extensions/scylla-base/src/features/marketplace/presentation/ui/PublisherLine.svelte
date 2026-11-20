<script lang="ts">
  import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
  import { t } from '@scylla/ui/i18n';
  import type { Publisher } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';

  let { publisher }: { publisher: Publisher } = $props();
</script>

<span class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
  <span class="truncate">@{publisher.handle}</span>
  {#if publisher.verified}
    <BadgeCheckIcon
      class="size-3 shrink-0 text-primary"
      aria-label={t(marketplaceMessages.verifiedPublisher)}
    />
  {/if}
</span>
