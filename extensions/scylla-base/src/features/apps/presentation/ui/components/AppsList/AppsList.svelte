<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import PlugIcon from '@lucide/svelte/icons/plug';
  import { can, Permission } from '@platform/authz';
  import { contextStore, scyllaNavigate } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, ErrorState, FeatureHeader, ListSkeleton } from '@scylla/ui';
  import {
    Table,
    TableBody,
    TableFrame,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations, appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import AddAppDialog from '../AddAppDialog/AddAppDialog.svelte';
  import EmptyList from '../EmptyList/EmptyList.svelte';
  import AppRow from './AppRow.svelte';
  import { appsMessages } from '@base/features/apps/presentation/messages/apps.messages.ts';
  import { appsListMessages as messages } from '@base/features/apps/presentation/messages/apps-list.messages.ts';

  const phone = new MediaQuery('(max-width: 639px)');

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const workspaceName = $derived(context().workspace.name ?? '');
  const target = $derived({ workspaceId });

  const canCreate = $derived(can(Permission.CREATE_APP, target));
  const canManage = $derived(can(Permission.DELETE_APP, target));
  const canReadApp = $derived(can(Permission.READ_APP, target));
  const canReadRoles = $derived(can(Permission.LIST_WORKSPACE_MEMBERS, target));

  const apps = createQuery(() => appQueries.list(workspaceId, 'others'));
  const appIds = $derived((apps.data ?? []).map(app => app.id));
  const roles = createQuery(() =>
    appQueries.appRoles(workspaceId, workspaceName, appIds, canReadRoles),
  );

  const disable = createMutation(() => appMutations.disable());
  const enable = createMutation(() => appMutations.enable());
  const remove = createMutation(() => appMutations.remove());

  let addOpen = $state(false);
  let disabling = $state<AppEntity | null>(null);
  let deleting = $state<AppEntity | null>(null);

  const openApp = (id: string) => scyllaNavigate.goToWorkspaceRoute(`/apps/${id}`);
</script>

{#snippet blurb()}
  <p class="max-w-3xl text-sm text-muted-foreground">{t(messages.blurb)}</p>
{/snippet}

<div class="flex min-h-full w-full shrink-0 flex-col gap-6 pb-20" data-tour="apps">
  <FeatureHeader
    count={apps.data?.length}
    label={t(appsMessages.app)}
    pluralLabel={t(appsMessages.apps)}
    underLabel={blurb}
    onNew={() => (addOpen = true)}
    newLabel={t(messages.add)}
    canNew={canCreate}
    newDeniedReason={t(messages.needCreate(workspaceName))}
  />

  {#if apps.isError}
    <ErrorState message={apps.error?.message} />
  {:else if apps.isPending}
    <!-- Pending, not loading: the query waits for the permissions before its first call. -->
    <ListSkeleton rows={3} rowClass="h-14 w-full rounded-xl" />
  {:else if (apps.data ?? []).length === 0}
    <EmptyList
      icon={PlugIcon}
      title={canCreate ? t(messages.firstTitle) : t(messages.emptyTitle)}
      body={canCreate ? t(messages.firstBody) : t(messages.askAdmin(workspaceName))}
      addLabel={t(messages.add)}
      onAdd={canCreate ? () => (addOpen = true) : undefined}
    />
  {:else}
    {#if phone.current}
      <div class="flex flex-col gap-3">
        {#each apps.data ?? [] as app (app.id)}
          <AppRow
            {app}
            roles={roles.data?.get(app.id)}
            showRoles={canReadRoles}
            {canReadApp}
            asCard
            onOpen={() => openApp(app.id)}
            onDisable={canManage ? () => (disabling = app) : undefined}
            onEnable={canManage ? () => enable.mutate(app.id) : undefined}
            onDelete={canManage ? () => (deleting = app) : undefined}
          />
        {/each}
      </div>
    {:else}
    <TableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t(messages.columnApp)}</TableHead>
            <TableHead>{t(messages.columnCredentials)}</TableHead>
            {#if canReadRoles}
              <TableHead>{t(messages.columnAccess)}</TableHead>
            {/if}
            <TableHead>{t(messages.columnLastUsed)}</TableHead>
            <TableHead class="w-12">
              <span class="sr-only">{t(messages.columnActions)}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each apps.data ?? [] as app (app.id)}
            <AppRow
              {app}
              roles={roles.data?.get(app.id)}
              showRoles={canReadRoles}
              {canReadApp}
              onOpen={() => openApp(app.id)}
              onDisable={canManage ? () => (disabling = app) : undefined}
              onEnable={canManage ? () => enable.mutate(app.id) : undefined}
              onDelete={canManage ? () => (deleting = app) : undefined}
            />
          {/each}
        </TableBody>
      </Table>
    </TableFrame>
    {/if}
  {/if}
</div>

{#if workspaceId}
  <AddAppDialog open={addOpen} setOpen={open => (addOpen = open)} {workspaceId} {workspaceName} />
{/if}

<ConfirmOperationAlertDialog
  open={!!disabling}
  onOpenChange={open => {
    if (!open) disabling = null;
  }}
  title={t(messages.disableTitle(disabling?.name ?? ''))}
  description={t(messages.disableBody)}
  continueLabel={t(messages.disable)}
  isLoading={disable.isPending}
  onContinue={() => {
    if (disabling) disable.mutate(disabling.id, { onSuccess: () => (disabling = null) });
  }}
/>

<ConfirmOperationAlertDialog
  open={!!deleting}
  onOpenChange={open => {
    if (!open) deleting = null;
  }}
  title={t(messages.deleteTitle(deleting?.name ?? ''))}
  description={t(messages.deleteBody)}
  continueLabel={t(messages.delete)}
  isLoading={remove.isPending}
  onContinue={() => {
    if (deleting) remove.mutate(deleting.id, { onSuccess: () => (deleting = null) });
  }}
/>
