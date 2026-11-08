<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { createQuery, currentSearch, navigateTo, routePathname, WidgetZone } from '@scylla/core-sdk';
  import { accessQueries, workspaceRef } from '@base/features/access';
  import { appQueries } from '@base/features/apps';
  import { invitationQueries, loadPendingInvitations } from '@base/features/invitation';
  import { userQueries, type UserSummary } from '@base/features/user';
  import { invalidateWorkspaceMembers } from '@base/features/workspace';
  import { GatedButton, SegmentedControl } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Input } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import {
    membershipPoints,
    type WorkspaceMembersContext,
  } from '@base/features/membership/presentation/membership.points.ts';
  import {
    linkedApp,
    membershipMessages,
    workspaceBlurb,
  } from '../../messages/membership.messages.ts';
  import type { ActorChoice } from '../../presenters/actor-choice.presenter.ts';
  import {
    buildMemberRows,
    filterMemberRows,
    OWNER_KEY,
    type MemberRow,
    type MemberTab,
  } from '../../presenters/member-rows.presenter.ts';
  import AddMembersDialog from '../components/AddMembersDialog/AddMembersDialog.svelte';
  import ChangeRolesDialog from '../components/ChangeRolesDialog/ChangeRolesDialog.svelte';
  import ChooseActorRow from '../components/ChooseActorRow/ChooseActorRow.svelte';
  import MembersTable from '../components/MembersTable/MembersTable.svelte';
  import AppOutsideDialog from '../components/RefusalDialogs/AppOutsideDialog.svelte';
  import LastOwnerDialog from '../components/RefusalDialogs/LastOwnerDialog.svelte';
  import RemoveMemberDialog from '../components/RemoveMemberDialog/RemoveMemberDialog.svelte';

  const context = toRune(contextStore);
  const workspace = $derived(context().workspace);
  const workspaceId = $derived(workspace.id);
  const workspaceName = $derived(workspace.name ?? '');
  const target = $derived({ workspaceId: workspaceId ?? undefined });

  const canManage = $derived(can(Permission.MANAGE_WORKSPACE_GRANTS, target));
  const canRead = $derived(can(Permission.LIST_WORKSPACE_MEMBERS, target));
  // Without LIST_USERS, a name finds nobody: only an email adds someone.
  const canListUsers = $derived(can(Permission.LIST_USERS));

  const usersQuery = createQuery(() => userQueries.list({ enabled: canListUsers }));
  const membersQuery = createQuery(() =>
    accessQueries.members(workspaceId ? workspaceRef(workspaceId) : null, { enabled: canRead }),
  );

  const addAction = membershipPoints.workspaceAddMember.resolve({
    withoutDirectory: 'deny',
    variant: 'default',
  });
  const showAdd = $derived(canListUsers || addAction.withoutDirectory === 'deny');

  let tab = $state<MemberTab>('people');
  let search = $state('');
  let addOpen = $state(false);
  let changing = $state<MemberRow | null>(null);
  let removing = $state<MemberRow | null>(null);
  let lastOwner = $state<string | undefined>();
  let choosingApp = $state(false);
  let addingApp = $state<ActorChoice | null>(null);
  let outside = $state<string | null>(null);

  // A direct link gives a role to an app: `?addApp=<id>`. Another workspace gets a clear refusal.
  const linked = new URLSearchParams(currentSearch()).get('addApp');
  if (linked) {
    tab = 'apps';
    addingApp = { id: linked, name: t(linkedApp) };
  }

  const appsQuery = createQuery(() => {
    const query = appQueries.list(workspaceId ?? '');
    return { ...query, enabled: query.enabled && choosingApp };
  });

  const rows = $derived(buildMemberRows(membersQuery.data ?? []));
  const shown = $derived(filterMemberRows(rows, tab, search));
  const peopleCount = $derived(rows.filter(row => row.tab === 'people').length);
  const appCount = $derived(rows.filter(row => row.tab === 'apps').length);
  const tabOptions = $derived([
    { value: 'people' as const, label: t(membershipMessages.people), count: peopleCount },
    { value: 'apps' as const, label: t(membershipMessages.apps), count: appCount },
  ]);

  /** The directory gives the email when the caller can read it. */
  const userFor = (id: string): UserSummary | undefined =>
    usersQuery.data?.items.find(user => user.id === id);

  const appChoices = $derived(
    (appsQuery.data ?? [])
      .filter(app => !rows.some(row => row.actorId === app.id))
      .map(app => ({ id: app.id, name: app.name })),
  );

  const isOwner = (row: MemberRow) => row.workspaceRoles.some(role => role.roleKey === OWNER_KEY);

  /** The last owner stays: the dialog says so before a call that the server refuses. */
  const askToRemove = (row: MemberRow) => {
    if (isOwner(row) && rows.filter(isOwner).length <= 1) lastOwner = row.name;
    else removing = row;
  };

  const candidates = $derived(
    (usersQuery.data?.items ?? []).filter(user => !rows.some(row => row.actorId === user.id)),
  );

  const reload = () => {
    if (workspaceId) invalidateWorkspaceMembers(workspaceId);
    return membersQuery.refetch();
  };

  const refresh = () => {
    void reload();
  };

  /** `changing` keeps the name when the last role goes. The roles come from the query. */
  const changingRow = $derived(rows.find(row => row.actorId === changing?.actorId));
  const addingRow = $derived(rows.find(row => row.actorId === addingApp?.id));

  const invitationsQuery = createQuery(() => invitationQueries.list(workspaceId));

  const zoneContext: WorkspaceMembersContext = $derived({
    workspaceId: workspaceId ?? '',
    workspaceName,
    canManage,
    memberCount: peopleCount,
    openInvitationCount: invitationsQuery.data?.length ?? 0,
    refreshMembers: refresh,
  });

  const openMember = (row: MemberRow) =>
    navigateTo(`${routePathname()}/${encodeURIComponent(row.actorId)}`);
</script>

{#snippet actions()}
  <WidgetZone point={membershipPoints.workspaceActions} context={zoneContext}>
    {#if showAdd}
      <span class="contents" data-tour="members-add">
      <GatedButton
        allowed={canManage}
        deniedReason={t(membershipMessages.workspaceNewDenied)}
        variant={addAction.variant}
        onclick={() => {
          if (tab === 'apps') choosingApp = true;
          else addOpen = true;
        }}
      >
        {t(membershipMessages.addMembers)}
      </GatedButton>
      </span>
    {/if}
  </WidgetZone>
{/snippet}

{#if !workspaceId}
  <div class="flex h-full items-center justify-center">
    <p class="text-sm text-muted-foreground">{t(membershipMessages.selectAnWorkspace)}</p>
  </div>
{:else}
  <div class="flex w-full flex-col gap-4 pb-20" data-tour="members">
    <header class="flex items-start justify-between gap-6">
      <div class="flex flex-col gap-2">
        <h1>{t(membershipMessages.members)}</h1>
        <p class="max-w-3xl text-sm text-muted-foreground">
          {t(workspaceBlurb(workspaceName, workspaceName))}
        </p>
      </div>
      {@render actions()}
    </header>

    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <SegmentedControl
        value={tab}
        options={tabOptions}
        onChange={next => (tab = next)}
        aria-label={t(membershipMessages.memberKind)}
      />
      <Input
        class="md:w-64"
        placeholder={t(membershipMessages.searchMembers)}
        aria-label={t(membershipMessages.searchMembers)}
        value={search}
        oninput={event => (search = event.currentTarget.value)}
      />
    </div>

    {#if choosingApp}
      <ChooseActorRow
        choices={appChoices}
        loading={appsQuery.isLoading}
        onChoose={app => {
          addingApp = app;
          choosingApp = false;
        }}
        onCancel={() => (choosingApp = false)}
      />
    {/if}

    <MembersTable
      rows={shown}
      isLoading={membersQuery.isLoading}
      {userFor}
      {canManage}
      onOpen={openMember}
      onChangeRoles={row => (changing = row)}
      onRemove={askToRemove}
    />

    {#await loadPendingInvitations() then { default: PendingInvitations }}
      <PendingInvitations {workspaceId} />
    {/await}

    <WidgetZone point={membershipPoints.workspaceSection} context={zoneContext} />

    <AddMembersDialog
      open={addOpen}
      onOpenChange={open => (addOpen = open)}
      {workspaceId}
      {workspaceName}
      {candidates}
      canBrowse={canListUsers}
      onAdded={refresh}
    />

    <ChangeRolesDialog
      {...changing ? { actorId: changing.actorId, holder: changing.tab } : {}}
      name={changing?.name ?? ''}
      scopeName={workspaceName}
      roles={changingRow?.workspaceRoles ?? []}
      otherRoles={changingRow?.projectRoles ?? []}
      {workspaceId}
      object={workspaceRef(workspaceId)}
      onClose={() => (changing = null)}
      onChanged={reload}
    />

    <ChangeRolesDialog
      {...addingApp ? { actorId: addingApp.id } : {}}
      holder="apps"
      name={addingApp?.name ?? ''}
      scopeName={workspaceName}
      roles={addingRow?.workspaceRoles ?? []}
      otherRoles={addingRow?.projectRoles ?? []}
      {workspaceId}
      object={workspaceRef(workspaceId)}
      onClose={() => (addingApp = null)}
      onChanged={reload}
      onOutside={() => {
        outside = addingApp?.name ?? '';
        addingApp = null;
      }}
    />

    <AppOutsideDialog
      open={outside !== null}
      name={outside ?? ''}
      {workspaceName}
      onClose={() => (outside = null)}
    />

    <LastOwnerDialog name={lastOwner} {workspaceName} onClose={() => (lastOwner = undefined)} />

    <RemoveMemberDialog
      row={removing}
      {workspaceId}
      {workspaceName}
      onClose={() => (removing = null)}
      onRemoved={refresh}
    />
  </div>
{/if}
