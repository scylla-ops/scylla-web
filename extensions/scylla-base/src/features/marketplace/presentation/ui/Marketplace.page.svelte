<script lang="ts">
  import { Card } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { marketplaceMessages } from './marketplace.messages.ts';

  // A placeholder: the repository returns fixtures. See AGENTS.md.
</script>

<div class="flex h-full w-full items-center justify-center bg-background">
  <Card class="p-8 text-center">
    <p class="text-lg text-muted-foreground">{t(marketplaceMessages.comingSoon)}</p>
  </Card>
</div>
