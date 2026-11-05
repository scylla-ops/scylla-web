<script lang="ts">
  import { contextStore } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, ErrorState, ListSkeleton } from '@scylla/ui';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { ApiAccessCard } from '@shared/presentation/ui';
  import { personalTokenQueries } from '@base/features/user';
  import {
    workspaceMutations,
    workspaceQueries,
  } from '@base/features/workspace/presentation/workspace.queries.ts';
  import { workspaceSettingsMessages as messages } from '@base/features/workspace/presentation/messages/workspace-settings.messages.ts';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const name = $derived(context().workspace.name ?? '');

  const mine = createQuery(() => workspaceQueries.mine());
  const tokens = createQuery(() => personalTokenQueries.mine());
  const update = createMutation(() => workspaceMutations.setPersonalTokens());

  let confirming = $state(false);

  const workspace = $derived(mine.data?.find(item => item.id === workspaceId));
  /** The switch of the server comes first: when it is off, this one is off and locked. */
  const lockedOff = $derived(tokens.data?.enabled === false);

  const toggle = (next: boolean) => {
    if (next) update.mutate({ workspaceId, enabled: true });
    else confirming = true;
  };
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-8">
  <div>
    <h1 class="text-2xl font-semibold">{t(messages.title)}</h1>
    <p class="text-sm text-muted-foreground">{t(messages.description(name))}</p>
  </div>

  {#if mine.isError}
    <ErrorState message={mine.error?.message} />
  {:else if mine.isPending || !workspace}
    <ListSkeleton rows={1} rowClass="h-32 w-full rounded-xl" />
  {:else}
    <ApiAccessCard
      title={t(messages.personalTokens(name))}
      description={t(messages.personalTokensBody(name))}
      enabled={workspace.personalTokensEnabled && !lockedOff}
      disabled={update.isPending || lockedOff}
      onToggle={toggle}
    />
    <p class="text-xs text-muted-foreground">
      {t(lockedOff ? messages.lockedHint : messages.hint)}
    </p>
  {/if}
</div>

<ConfirmOperationAlertDialog
  open={confirming}
  onOpenChange={open => (confirming = open)}
  title={t(messages.confirmTitle(name))}
  description={t(messages.confirmBody(name))}
  continueLabel={t(messages.confirm)}
  isLoading={update.isPending}
  onContinue={() =>
    update.mutate({ workspaceId, enabled: false }, { onSuccess: () => (confirming = false) })}
/>
