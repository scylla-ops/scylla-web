<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import {
    LEGAL_DOCUMENT_KINDS,
    legalDocumentOf,
    legalMutations,
    legalQueries,
    type UpdateLegalSettingsInput,
  } from '@platform/legal';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { legalSettingsMessages as messages } from '@base/features/legal/presentation/messages/legal-settings.messages.ts';
  import ConsentBannerCard from './ConsentBannerCard.svelte';
  import DocumentRow from './DocumentRow.svelte';
  import LegalSection from './LegalSection.svelte';
  import OperatorCard from './OperatorCard.svelte';
  import PrivacyContactCard from './PrivacyContactCard.svelte';

  const info = createQuery(() => legalQueries.info());
  const update = createMutation(() => legalMutations.update());

  const disabled = $derived(update.isPending || !can(Permission.MANAGE_INSTANCE_SETTINGS));

  const save = (input: UpdateLegalSettingsInput, saved: () => void) =>
    update.mutate(input, { onSuccess: saved });
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-20">
  <div>
    <h1>{t(messages.title)}</h1>
    <p class="text-sm text-muted-foreground">{t(messages.description)}</p>
  </div>

  {#if info.isError}
    <ErrorState message={info.error?.message} />
  {:else if info.isPending}
    <ListSkeleton rows={3} rowClass="h-40 w-full rounded-xl" />
  {:else}
    <OperatorCard
      operator={info.data.operator}
      {disabled}
      onSave={(operator, saved) => save({ operator }, saved)}
    />
    <LegalSection title={t(messages.documentsTitle)} description={t(messages.documentsDescription)}>
      <ul class="flex flex-col gap-3">
        {#each LEGAL_DOCUMENT_KINDS as kind (kind)}
          <DocumentRow
            {kind}
            document={legalDocumentOf(info.data, kind)}
            {disabled}
            onSave={(change, saved) => save({ documents: [change] }, saved)}
          />
        {/each}
      </ul>
    </LegalSection>
    <PrivacyContactCard
      contact={info.data.privacyContact}
      {disabled}
      onSave={(privacyContact, saved) => save({ privacyContact }, saved)}
    />
    <ConsentBannerCard />
  {/if}
</div>
