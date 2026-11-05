<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, ErrorState, ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { ApiAccessCard } from '@shared/presentation/ui';
  import {
    instanceSettingsMutations,
    instanceSettingsQueries,
  } from '@base/features/instance-settings/presentation/instance-settings.queries.ts';
  import { instanceSettingsMessages as messages } from '@base/features/instance-settings/presentation/messages/instance-settings.messages.ts';

  const settings = createQuery(() => instanceSettingsQueries.get());
  const update = createMutation(() => instanceSettingsMutations.setPersonalTokens());

  const canManage = $derived(can(Permission.MANAGE_INSTANCE_SETTINGS));

  let confirming = $state(false);

  const toggle = (next: boolean) => {
    if (next) update.mutate(true);
    else confirming = true;
  };
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-8">
  <div>
    <h1 class="text-2xl font-semibold">{t(messages.title)}</h1>
    <p class="text-sm text-muted-foreground">{t(messages.description)}</p>
  </div>

  {#if settings.isError}
    <ErrorState message={settings.error?.message} />
  {:else if settings.isPending}
    <ListSkeleton rows={1} rowClass="h-32 w-full rounded-xl" />
  {:else}
    <ApiAccessCard
      title={t(messages.personalTokens)}
      description={t(messages.personalTokensBody)}
      enabled={settings.data.personalTokensEnabled}
      disabled={update.isPending || !canManage}
      onToggle={toggle}
    />
    <p class="text-xs text-muted-foreground">{t(messages.hint)}</p>
  {/if}
</div>

<ConfirmOperationAlertDialog
  open={confirming}
  onOpenChange={open => (confirming = open)}
  title={t(messages.confirmTitle)}
  description={t(messages.confirmBody(settings.data?.activePersonalTokens ?? 0))}
  continueLabel={t(messages.confirm)}
  isLoading={update.isPending}
  onContinue={() => update.mutate(false, { onSuccess: () => (confirming = false) })}
/>
