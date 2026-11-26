<script lang="ts">
  import { contextStore } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, ErrorState, ListSkeleton } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { ApiAccessCard } from '@shared/presentation/ui';
  import { personalTokenQueries } from '@base/features/user';
  import {
    workspaceMutations,
    workspaceQueries,
  } from '@base/features/workspace/presentation/workspace.queries.ts';
  import { workspaceSettingsMessages as messages } from '@base/features/workspace/presentation/messages/workspace-settings.messages.ts';
  import TimeZoneCard from './TimeZoneCard.svelte';
  import WorkspaceTitleIcon from './WorkspaceTitleIcon.svelte';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const name = $derived(context().workspace.name ?? '');

  const mine = createQuery(() => workspaceQueries.mine());
  const tokens = createQuery(() => personalTokenQueries.mine());
  const update = createMutation(() => workspaceMutations.setPersonalTokens());
  const zone = createMutation(() => workspaceMutations.setTimeZone());

  let confirming = $state(false);

  const workspace = $derived(mine.data?.find(item => item.id === workspaceId));
  /** The switch of the server comes first: when it is off, this one is off and locked. */
  const lockedOff = $derived(tokens.data?.enabled === false);

  const toggle = (next: boolean) => {
    if (next) update.mutate({ workspaceId, enabled: true });
    else confirming = true;
  };
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-20">
  <div class="flex min-w-0 items-center gap-4">
    {#if workspace}
      <WorkspaceTitleIcon {workspace} />
    {:else if mine.isPending}
      <Skeleton class="size-12 shrink-0 rounded-xl" />
    {/if}
    <div class="flex min-w-0 flex-col justify-center gap-1">
      <h1>{t(messages.title)}</h1>
      <p class="text-sm text-muted-foreground">{t(messages.description(name))}</p>
    </div>
  </div>

  {#if mine.isError}
    <ErrorState message={mine.error?.message} />
  {:else if mine.isPending || !workspace}
    <ListSkeleton rows={2} rowClass="h-32 w-full rounded-xl" />
  {:else}
    <TimeZoneCard
      {name}
      timeZone={workspace.timeZone}
      disabled={zone.isPending}
      onChange={timeZone => zone.mutate({ workspaceId, timeZone })}
    />
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
