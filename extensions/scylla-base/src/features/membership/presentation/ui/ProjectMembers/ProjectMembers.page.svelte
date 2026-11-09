<script lang="ts">
  import InfoIcon from '@lucide/svelte/icons/info';
  import { can, Permission } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { createQuery, navigateTo, routePathname, WidgetZone } from '@scylla/core-sdk';
  import { accessQueries, projectRef } from '@base/features/access';
  import { appQueries } from '@base/features/apps';
  import { userQueries } from '@base/features/user';
  import { GatedButton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    Button,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableFrame,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { Identity } from '@shared/presentation/ui';
  import {
    membershipPoints,
    type ProjectMembersContext,
  } from '@base/features/membership/presentation/membership.points.ts';
  import {
    addTo,
    changeIn,
    membersOf,
    membershipMessages,
    projectRuleTitle,
  } from '../../messages/membership.messages.ts';
  import { appChoice, memberChoice } from '../../presenters/actor-choice.presenter.ts';
  import { memberRoleName } from '../../presenters/member-role-name.ts';
  import { buildProjectMemberRows, memberProfile } from '../../presenters/member-rows.presenter.ts';
  import ChangeRolesDialog from '../components/ChangeRolesDialog/ChangeRolesDialog.svelte';
  import ChooseActorRow from '../components/ChooseActorRow/ChooseActorRow.svelte';
  import ScopeLabel from '../components/ScopeLabel.svelte';

  let { projectId }: { projectId?: string } = $props();

  interface Changing {
    actorId: string;
    name: string;
    holder: 'people' | 'apps';
  }

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const workspaceName = $derived(context().workspace.name ?? '');
  const target = $derived({
    projectId: projectId ?? undefined,
    workspaceId: workspaceId ?? undefined,
  });

  const canManage = $derived(can(Permission.MANAGE_PROJECT_GRANTS, target));
  const object = $derived(projectId ? projectRef(projectId) : null);

  const projectName = $derived(context().project.name ?? '');

  const membersQuery = createQuery(() =>
    accessQueries.members(object, { enabled: can(Permission.LIST_PROJECT_MEMBERS, target) }),
  );
  const rows = $derived(buildProjectMemberRows(membersQuery.data ?? []));

  let changing = $state<Changing | null>(null);
  let adding = $state(false);

  const appsQuery = createQuery(() => {
    const query = appQueries.list(workspaceId ?? '');
    return { ...query, enabled: query.enabled && adding };
  });

  const usersQuery = createQuery(() =>
    userQueries.list({ enabled: adding && can(Permission.LIST_USERS) }),
  );

  /** A person with a role in the workspace, or an app of the workspace, with no role here yet. */
  const candidates = $derived([
    ...rows
      .filter(row => row.inheritedOnly)
      .map(row => memberChoice(row, usersQuery.data?.items.find(user => user.id === row.actorId))),
    ...(appsQuery.data ?? [])
      .filter(app => !rows.some(row => row.actorId === app.id))
      .map(appChoice),
  ]);

  const startChange = (id: string, name: string) => {
    const row = rows.find(one => one.actorId === id);
    changing = { actorId: id, name, holder: row?.tab ?? 'apps' };
  };

  const changingRoles = $derived(rows.find(row => row.actorId === changing?.actorId)?.roles ?? []);

  const refresh = () => {
    void membersQuery.refetch();
  };

  const zoneContext: ProjectMembersContext = $derived({
    workspaceId: workspaceId ?? '',
    projectId: projectId ?? '',
    canManage,
    memberCount: rows.length,
    refreshMembers: refresh,
  });

  const slug = $derived(routePathname().split('/')[1] ?? '');
  const openChange = () => navigateTo(`/${slug}/access/members`);
</script>

{#if projectId}
  <div class="flex w-full flex-col gap-4 pb-20">
    <header class="flex items-start justify-between gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-xl">{t(membersOf(projectName))}</h2>
        <p class="max-w-3xl text-sm text-muted-foreground">
          {t(membershipMessages.projectBlurb)}
        </p>
      </div>
      <WidgetZone point={membershipPoints.projectActions} context={zoneContext}>
        <GatedButton
          allowed={canManage}
          deniedReason={t(membershipMessages.projectNewDenied)}
          onclick={() => (adding = true)}
        >
          {t(addTo(projectName))}
        </GatedButton>
      </WidgetZone>
    </header>

    {#if adding}
      <ChooseActorRow
        choices={candidates}
        loading={appsQuery.isLoading}
        onChoose={choice => {
          startChange(choice.id, choice.name);
          adding = false;
        }}
        onCancel={() => (adding = false)}
      />
    {/if}

    {#if membersQuery.isLoading}
      <div role="status" aria-busy="true" class="flex flex-col gap-2">
        {#each [0, 1, 2] as index (index)}
          <Skeleton class="h-14 w-full rounded-xl" />
        {/each}
      </div>
    {:else if rows.length === 0}
      <p class="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        {t(membershipMessages.projectEmpty)}
      </p>
    {:else}
      <TableFrame>
        <Table class="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t(membershipMessages.member)}</TableHead>
              <TableHead>{t(membershipMessages.rolesHere)}</TableHead>
              <TableHead>{t(membershipMessages.comesFrom)}</TableHead>
              <TableHead class="w-40"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each rows as row (row.actorId)}
              <TableRow class={row.inheritedOnly ? '[&>td]:bg-muted/50' : ''}>
                <TableCell>
                  <Identity profile={memberProfile(row)} kind={row.kind} />
                </TableCell>
                <TableCell class="whitespace-normal">
                  <div class="flex flex-wrap gap-1.5">
                    {#each row.roles as role (`${role.scopeKind}-${role.role}`)}
                      <span class="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">
                        {memberRoleName(role)}
                      </span>
                    {/each}
                  </div>
                </TableCell>
                <TableCell class="whitespace-normal">
                  <div class="flex flex-wrap gap-x-3 gap-y-1.5">
                    {#each row.scopes as scope (scope.scopeKind)}
                      <ScopeLabel kind={scope.scopeKind} name={scope.scopeName} />
                    {/each}
                  </div>
                </TableCell>
                <TableCell class="text-right">
                  {#if row.inheritedOnly}
                    <button
                      type="button"
                      class="text-xs font-medium text-primary hover:underline"
                      onclick={openChange}
                    >
                      {t(changeIn(workspaceName))}
                    </button>
                  {:else if canManage}
                    <Button variant="ghost" onclick={() => startChange(row.actorId, row.name)}>
                      {t(membershipMessages.changeRoles)}
                    </Button>
                  {/if}
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </TableFrame>

      <aside class="flex gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <InfoIcon class="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p class="text-sm font-medium">{t(projectRuleTitle(workspaceName))}</p>
          <p class="mt-1 text-xs text-muted-foreground">{t(membershipMessages.projectRuleHint)}</p>
        </div>
      </aside>
    {/if}

    <WidgetZone point={membershipPoints.projectSection} context={zoneContext} />

    {#if object && workspaceId}
      <ChangeRolesDialog
        {...changing ? { actorId: changing.actorId, holder: changing.holder } : {}}
        name={changing?.name ?? ''}
        scopeName={projectName}
        roles={changingRoles.filter(role => role.scopeKind === 'project')}
        otherRoles={changingRoles.filter(role => role.scopeKind === 'workspace')}
        {workspaceId}
        {object}
        onClose={() => (changing = null)}
        onChanged={() => membersQuery.refetch()}
      />
    {/if}
  </div>
{/if}
