<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { contextStore, scyllaNavigate } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, ErrorState, GatedButton } from '@scylla/ui';
  import { Badge, Skeleton } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { appStateOf } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations, appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import AppStateDot from '../components/AppStateDot/AppStateDot.svelte';
  import AppHostCard from './AppHostCard.svelte';
  import AppKeysCard from './AppKeysCard.svelte';
  import AppRolesCard from './AppRolesCard.svelte';
  import AppJobsCard from './AppJobsCard.svelte';
  import { appsMessages } from '@base/features/apps/presentation/messages/apps.messages.ts';

  let { appId = '' }: { appId?: string } = $props();

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const target = $derived({ workspaceId: workspaceId || undefined });

  const details = createQuery(() => appQueries.byId(appId, workspaceId));
  const remove = createMutation(() => appMutations.remove());

  const app = $derived(details.data?.app);
  const canManage = $derived(can(Permission.CREATE_APP, target));
  const canDelete = $derived(can(Permission.DELETE_APP, target));

  const STATE_LABEL = {
    online: appsMessages.online,
    offline: appsMessages.offline,
    never: appsMessages.never,
  } as const;

  let confirmDelete = $state(false);
</script>

{#if details.isError}
  <ErrorState message={details.error?.message} />
{:else if !app}
  <Skeleton class="h-40 w-full" />
{:else}
  {@const state = appStateOf(app)}
  <div class="flex flex-col gap-4" data-tour="agent-details">
    <header class="flex flex-wrap items-center gap-3">
      <span data-tour="agent-status" data-online={app.connected}>
        <AppStateDot {state} class="size-2.5" />
      </span>
      <h1 class="text-xl font-semibold">{app.name}</h1>
      {#if app.runner}<Badge variant="secondary">{t(appsMessages.agentBadge)}</Badge>{/if}
      <span class="text-sm text-muted-foreground">
        {t(STATE_LABEL[state])}
        {#if app.lastSeenAt && !app.connected}
          · {t(appsMessages.lastSeen(getRelativeTime(app.lastSeenAt)))}
        {/if}
      </span>
      <span class="ml-auto">
        <GatedButton
          allowed={canDelete}
          variant="outline"
          class="text-destructive"
          onclick={() => (confirmDelete = true)}
        >
          {t(appsMessages.delete)}
        </GatedButton>
      </span>
    </header>

    <div class="grid gap-4 lg:grid-cols-2">
      <AppHostCard host={app.host} />
      <AppKeysCard {appId} runner={app.runner} keys={details.data?.keys ?? []} {canManage} />
      <AppRolesCard
        {appId}
        {workspaceId}
        canRead={can(Permission.LIST_WORKSPACE_MEMBERS, target)}
        canManage={can(Permission.MANAGE_WORKSPACE_GRANTS, target)}
      />
      {#if app.runner}
        <AppJobsCard
          {appId}
          {workspaceId}
          canRead={can(Permission.LIST_JOBS_BY_WORKSPACE, target)}
        />
      {/if}
    </div>
  </div>

  <ConfirmOperationAlertDialog
    open={confirmDelete}
    onOpenChange={open => (confirmDelete = open)}
    title={t(appsMessages.deleteTitle(app.name))}
    description={t(appsMessages.deleteBody)}
    continueLabel={t(appsMessages.delete)}
    isLoading={remove.isPending}
    onContinue={() =>
      remove.mutate(appId, {
        onSuccess: () => {
          confirmDelete = false;
          scyllaNavigate.goToWorkspaceRoute('/apps');
        },
      })}
  />
{/if}
