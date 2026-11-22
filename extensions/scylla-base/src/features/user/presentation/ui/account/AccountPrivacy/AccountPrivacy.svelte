<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import CookieIcon from '@lucide/svelte/icons/cookie';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { consentFrame, consentMessages, cookieSettings } from '@platform/consent';
  import type { LucideIcon } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import AcceptedTerms from './AcceptedTerms.svelte';
  import DataExportPanel from './DataExportPanel.svelte';
  import SettingsSection from '@base/features/user/presentation/ui/components/SettingsSection.svelte';
  import { privacyMessages as m } from '@base/features/user/presentation/messages/privacy.messages.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  // The cookie settings: only while one tracker needs consent.
  const consent = consentFrame().on;
</script>

<!-- One line of a card: an icon, centered on a link. -->
{#snippet line(Icon: LucideIcon, href: string, label: MessageDescriptor)}
  <p class="flex items-center gap-2 text-sm">
    <Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <a {href} class="underline underline-offset-4 hover:text-primary">{t(label)}</a>
  </p>
{/snippet}

<SettingsSection title={t(m.yourData)} description={t(m.yourDataDescription)}>
  <DataExportPanel />
</SettingsSection>

<AcceptedTerms />

<!-- The public pages of the legal texts: `/legal/<kind>`. -->
<SettingsSection title={t(m.privacyPolicy)} description={t(m.privacyPolicyDescription)}>
  {@render line(FileTextIcon, '/legal/privacy', m.readPrivacyPolicy)}
</SettingsSection>

<SettingsSection title={t(m.cookies)} description={t(m.cookiesDescription)}>
  <div class="flex flex-wrap items-center justify-between gap-3">
    {@render line(CookieIcon, '/legal/cookies', m.seeStorage)}
    {#if consent}
      <Button variant="outline" size="sm" onclick={() => cookieSettings.open('account')}>
        <SlidersHorizontalIcon aria-hidden="true" />
        {t(consentMessages.cookieSettings)}
      </Button>
    {/if}
  </div>
</SettingsSection>

<!-- The page is `account/privacy`: the relative link goes to `account/danger-zone`. -->
<p class="flex items-center justify-center gap-2 text-sm text-muted-foreground">
  <Trash2Icon class="size-4 shrink-0" aria-hidden="true" />
  <span>
    {t(m.deleteHint)}
    <a href="danger-zone" class="text-foreground underline underline-offset-4 hover:text-primary"
      >{t(userMessages.dangerZone)}</a
    >.
  </span>
</p>
