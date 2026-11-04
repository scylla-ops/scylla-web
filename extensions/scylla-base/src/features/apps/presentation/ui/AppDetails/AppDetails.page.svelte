<script lang="ts">
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { can, Permission } from '@platform/authz';
  import { contextStore, scyllaNavigate } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, ErrorState } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import {
    credentialRows,
    lastUsedOf,
  } from '@base/features/apps/domain/structs/app-credentials.struct.ts';
  import { appMutations, appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import { credentialQueries } from '@base/features/apps/presentation/app-credentials.queries.ts';
  import AgentDangerZone from '../AgentDetails/AgentDangerZone.svelte';
  import AppHeader from './AppHeader.svelte';
  import AppRolesCard from './AppRolesCard.svelte';
  import AppActivityCard from './AppActivityCard.svelte';
  import AppCredentialsCard from './AppCredentialsCard.svelte';
  import AddCredentialDialog from './AddCredentialDialog.svelte';
  import { agentPageMessages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  let { appId = '' }: { appId?: string } = $props();

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const target = $derived({ workspaceId });

  const canCreate = $derived(can(Permission.CREATE_APP, target));
  const canManage = $derived(can(Permission.DELETE_APP, target));

  const details = createQuery(() => appQueries.byId(appId, workspaceId));
  const tokens = createQuery(() => credentialQueries.tokens(appId));
  const identities = createQuery(() => credentialQueries.ciIdentities(appId));

  const disable = createMutation(() => appMutations.disable());
  const enable = createMutation(() => appMutations.enable());

  const app = $derived(details.data?.app);
  const rows = $derived(
    credentialRows(tokens.data ?? [], identities.data ?? [], details.data?.keys ?? [], new Date()),
  );

  let disabling = $state(false);
  let adding = $state(false);
</script>

{#if details.isError}
  <ErrorState message={details.error?.message} />
{:else if !app}
  <div class="flex flex-col gap-4" aria-busy="true">
    <Skeleton class="h-12 w-72" />
    <div class="grid gap-4 lg:grid-cols-3">
      <Skeleton class="h-40 w-full rounded-xl lg:col-span-2" />
      <Skeleton class="h-40 w-full rounded-xl" />
    </div>
    <Skeleton class="h-64 w-full rounded-xl" />
  </div>
{:else}
  <div class="flex flex-col gap-6">
    <AppHeader
      {app}
      onDisable={canManage ? () => (disabling = true) : undefined}
      onEnable={canManage ? () => enable.mutate(app.id) : undefined}
      enabling={enable.isPending}
    />

    {#if app.disabledAt}
      <div
        class="flex items-start gap-3 rounded-xl border border-warning/60 bg-warning/10 p-4"
        role="status"
      >
        <TriangleAlertIcon class="mt-0.5 size-4 text-warning" aria-hidden="true" />
        <p class="text-sm font-medium">
          {t(agentPageMessages.disabledSince(formatDay(app.disabledAt)))}
        </p>
      </div>
    {/if}

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <AppRolesCard
          {appId}
          {workspaceId}
          canRead={can(Permission.LIST_WORKSPACE_MEMBERS, target)}
          canManage={can(Permission.MANAGE_WORKSPACE_GRANTS, target)}
        />
      </div>
      <AppActivityCard latest={lastUsedOf(rows)} />
    </div>

    <AppCredentialsCard
      appId={app.id}
      {rows}
      onAdd={canCreate && !app.disabledAt ? () => (adding = true) : undefined}
      canManage={canCreate}
    />

    {#if canManage}
      <AgentDangerZone
        app
        agentId={app.id}
        agentName={app.name}
        onDeleted={() => scyllaNavigate.goToWorkspaceRoute('/apps')}
      />
    {/if}
  </div>

  {#if adding}
    <AddCredentialDialog
      open={adding}
      setOpen={open => (adding = open)}
      {app}
      {workspaceId}
      keysBefore={details.data?.keys.length ?? 0}
    />
  {/if}

  <ConfirmOperationAlertDialog
    open={disabling}
    onOpenChange={open => (disabling = open)}
    title={t(agentPageMessages.disableTitle(app.name))}
    description={t(agentPageMessages.disableBody)}
    continueLabel={t(agentPageMessages.disable)}
    isLoading={disable.isPending}
    onContinue={() => disable.mutate(app.id, { onSuccess: () => (disabling = false) })}
  />
{/if}
