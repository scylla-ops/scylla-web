<script lang="ts">
  import InfoIcon from '@lucide/svelte/icons/info';
  import { can, Permission } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { createQuery, navigateTo, routePathname, WidgetZone } from '@scylla/core-sdk';
  import { accessQueries, projectRef, type MemberRoleEntity } from '@base/features/access';
  import { appQueries } from '@base/features/apps';
  import { GatedButton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button, Skeleton } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { UserIdentity } from '@shared/presentation/ui';
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
  import { memberRoleName } from '../../presenters/member-role-name.ts';
  import { buildProjectMemberRows, memberProfile } from '../../presenters/member-rows.presenter.ts';
  import ChangeRolesDialog from '../components/ChangeRolesDialog/ChangeRolesDialog.svelte';
  import ChooseActorRow from '../components/ChooseActorRow/ChooseActorRow.svelte';

  let { projectId }: { projectId?: string } = $props();

  interface Changing {
    actorId: string;
    name: string;
    holder: 'people' | 'apps';
    roles: MemberRoleEntity[];
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

  /** A person with a role in the workspace, or an app of the workspace, with no role here yet. */
  const candidates = $derived([
    ...rows
      .filter(row => row.inheritedOnly)
      .map(row => ({ id: row.actorId, name: row.name })),
    ...(appsQuery.data ?? [])
      .filter(app => !rows.some(row => row.actorId === app.id))
      .map(app => ({ id: app.id, name: app.name })),
  ]);

  const startChange = (id: string, name: string) => {
    const row = rows.find(one => one.actorId === id);
    changing = {
      actorId: id,
      name,
      holder: row?.tab ?? 'apps',
      roles: (row?.roles ?? []).filter(role => role.scopeKind === 'project'),
    };
  };

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
  <div class="flex w-full flex-col gap-4">
    <header class="flex items-start justify-between gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-xl font-semibold">{t(membersOf(projectName))}</h2>
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
      <div class="relative overflow-x-auto rounded-xl border bg-card">
        <table class="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr class="text-left text-xs text-muted-foreground">
              <th class="px-6 py-3 font-medium">{t(membershipMessages.member)}</th>
              <th class="px-3 py-3 font-medium">{t(membershipMessages.rolesHere)}</th>
              <th class="px-3 py-3 font-medium">{t(membershipMessages.comesFrom)}</th>
              <th class="w-40"></th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row (row.actorId)}
              <tr class="border-t {row.inheritedOnly ? 'bg-muted/50' : ''}">
                <td class="px-6 py-3">
                  <UserIdentity
                    user={memberProfile(row)}
                  />
                </td>
                <td class="px-3 py-3">
                  <div class="flex flex-wrap gap-1.5">
                    {#each row.roles as role (`${role.scopeKind}-${role.role}`)}
                      <span class="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">
                        {memberRoleName(role)}
                      </span>
                    {/each}
                  </div>
                </td>
                <td class="px-3 py-3">
                  <div class="flex flex-wrap gap-1.5">
                    {#each row.scopes as scope (scope.scopeKind)}
                      <span class="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                        {scope.scopeName}
                      </span>
                    {/each}
                  </div>
                </td>
                <td class="pr-4 text-right">
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
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

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
        roles={changing?.roles ?? []}
        {workspaceId}
        {object}
        onClose={() => (changing = null)}
        onChanged={refresh}
      />
    {/if}
  </div>
{/if}
