<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Badge, Button } from '@scylla/ui/primitives';
  import { registeredTrackers, trackersNeedingConsent, TrackerTable } from '@platform/trackers';
  import { legalSettingsMessages as messages } from '@base/features/legal/presentation/messages/legal-settings.messages.ts';
  import LegalSection from './LegalSection.svelte';

  const trackers = registeredTrackers();
  const needingConsent = trackersNeedingConsent(trackers);
  const on = needingConsent.length > 0;

  let listing = $state(false);
</script>

<!-- The state of the banner comes from the tracker registry: nothing to set here. -->
<LegalSection title={t(messages.bannerTitle)}>
  {#snippet action()}
    <Badge variant={on ? 'warning' : 'secondary'}>
      {on ? t(messages.bannerOn) : t(messages.bannerOff)}
    </Badge>
  {/snippet}
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm text-muted-foreground">
        {on
          ? t(messages.bannerOnBody(needingConsent.length))
          : t(messages.bannerOffBody(trackers.length))}
      </p>
      <Button variant="outline" size="sm" onclick={() => (listing = !listing)}>
        {listing ? t(messages.hideList) : t(messages.showList)}
      </Button>
    </div>
    {#if listing}
      <TrackerTable {trackers} />
    {/if}
  </div>
</LegalSection>
