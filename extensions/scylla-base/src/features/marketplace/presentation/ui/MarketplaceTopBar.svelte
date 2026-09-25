<script lang="ts">
  import { Input } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { marketplaceFilter } from '../marketplace-filter.state.svelte.ts';
  import { marketplaceMessages } from './marketplace.messages.ts';
</script>

<Input
  value={marketplaceFilter.value}
  oninput={event => marketplaceFilter.set(event.currentTarget.value)}
  placeholder={t(marketplaceMessages.search)}
  class="w-[20%] bg-background"
/>
