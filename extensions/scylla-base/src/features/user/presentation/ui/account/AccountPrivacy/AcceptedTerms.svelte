<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import FileCheckIcon from '@lucide/svelte/icons/file-check';
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { legalDocumentHref, legalDocumentOf, legalQueries } from '@platform/legal';
  import { loginQueries } from '@base/features/login';
  import { formatDate } from '@shared/utils/date-utils.ts';
  import SettingsSection from '@base/features/user/presentation/ui/components/SettingsSection.svelte';
  import { privacyMessages as m } from '@base/features/user/presentation/messages/privacy.messages.ts';

  const status = createQuery(() => loginQueries.terms());
  const legal = createQuery(() => legalQueries.info());

  const accepted = $derived(status.data?.accepted ?? null);
  const terms = $derived(legalDocumentOf(legal.data, 'terms'));
</script>

<!-- The last version that the user accepted. Nothing before a first acceptance. -->
{#if accepted}
  <SettingsSection title={t(m.terms)} description={t(m.termsDescription)}>
    <div class="flex items-center gap-3">
      <FileCheckIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div class="flex min-w-0 grow flex-col gap-0.5">
        <p class="text-sm font-medium">
          {accepted.version ? t(m.termsOfServiceVersion(accepted.version)) : t(m.termsOfService)}
        </p>
        <p class="text-sm text-muted-foreground">
          {t(m.acceptedOn(formatDate(accepted.acceptedAt)))}
        </p>
      </div>
      {#if terms}
        <a
          href={legalDocumentHref(terms)}
          target="_blank"
          rel="noopener noreferrer"
          class="flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t(m.readTerms)}
          <ExternalLinkIcon class="size-3.5" aria-hidden="true" />
        </a>
      {/if}
    </div>
  </SettingsSection>
{/if}
