<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, DangerZone, ErrorState, ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import {
    mailSettingsMutations,
    mailSettingsQueries,
  } from '@base/features/instance-settings/presentation/instance-settings.queries.ts';
  import { mailSettingsMessages as messages } from '@base/features/instance-settings/presentation/messages/mail-settings.messages.ts';
  import { canSendTestMail } from '@base/features/instance-settings/presentation/presenters/mail-settings.presenter.ts';
  import MailRelayCard from './MailRelayCard.svelte';
  import TestMailCard from './TestMailCard.svelte';

  const settings = createQuery(() => mailSettingsQueries.get());
  const update = createMutation(() => mailSettingsMutations.update());
  const reset = createMutation(() => mailSettingsMutations.reset());

  const canManage = $derived(can(Permission.MANAGE_INSTANCE_SETTINGS));
  const disabled = $derived(!canManage || update.isPending || reset.isPending);

  let confirming = $state(false);
</script>

<div class="flex flex-col gap-4 pb-20">
  <div>
    <h1>{t(messages.title)}</h1>
    <p class="text-sm text-muted-foreground">{t(messages.description)}</p>
  </div>

  {#if !settings.data && settings.isError}
    <ErrorState message={settings.error?.message} />
  {:else if !settings.data}
    <ListSkeleton rows={2} rowClass="h-40 w-full rounded-xl" />
  {:else}
    <!-- A new form when the relay goes or comes: a reset forgets the draft. -->
    {#key settings.data.relay === null}
      <MailRelayCard
        settings={settings.data}
        {disabled}
        onSave={(input, saved) => update.mutate(input, { onSuccess: saved })}
      />
    {/key}
    <TestMailCard canSend={canSendTestMail(settings.data)} disabled={!canManage} />
    {#if settings.data.relay}
      <DangerZone title={t(messages.resetTitle)} description={t(messages.resetDescription)}>
        {#snippet action()}
          <Button variant="destructive" {disabled} onclick={() => (confirming = true)}>
            {t(messages.reset)}
          </Button>
        {/snippet}
      </DangerZone>
    {/if}
  {/if}
</div>

<ConfirmOperationAlertDialog
  open={confirming}
  onOpenChange={open => (confirming = open)}
  title={t(messages.resetConfirmTitle)}
  description={t(messages.resetConfirmBody)}
  continueLabel={t(messages.reset)}
  isLoading={reset.isPending}
  onContinue={() => reset.mutate(undefined, { onSuccess: () => (confirming = false) })}
/>
