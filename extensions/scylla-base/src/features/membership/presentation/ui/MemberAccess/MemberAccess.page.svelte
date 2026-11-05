<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import { can, Permission } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { createQuery, navigateTo, routeParams, routePathname } from '@scylla/core-sdk';
  import {
    accessQueries,
    projectRef,
    workspaceRef,
    type MemberRoleEntity,
    type ObjectRef,
  } from '@base/features/access';
  import { projectQueries } from '@base/features/project';
  import { roleQueries } from '@base/features/roles';
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import {
    effectiveHint,
    membershipMessages,
    projectOption,
    whatCanDo,
    workspaceOption,
  } from '../../messages/membership.messages.ts';
  import { memberRoleName } from '../../presenters/member-role-name.ts';
  import { setMemberCrumbName } from '../../member-crumb.state.svelte.ts';
  import ChangeRolesDialog from '../components/ChangeRolesDialog/ChangeRolesDialog.svelte';
  import EffectiveAccessTable from '../components/EffectiveAccessTable/EffectiveAccessTable.svelte';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const workspaceName = $derived(context().workspace.name ?? '');
  const actorId = $derived(routeParams().actorId ?? '');
  const listUrl = $derived(routePathname().split('/').slice(0, -1).join('/'));
  const slug = $derived(routePathname().split('/')[1] ?? '');

  const projectsQuery = createQuery(() => ({
    ...projectQueries.lookup(workspaceId ?? ''),
    enabled: !!workspaceId,
  }));
  const projects = $derived(projectsQuery.data?.items ?? []);

  /** Empty: the workspace itself. */
  let scopeId = $state('');
  const object = $derived<ObjectRef | null>(
    scopeId ? projectRef(scopeId) : workspaceId ? workspaceRef(workspaceId) : null,
  );
  const scopeName = $derived(
    scopeId ? (projects.find(project => project.id === scopeId)?.name ?? '') : workspaceName,
  );

  const accessQuery = createQuery(() => accessQueries.memberAccess(actorId, object));
  const catalogQuery = createQuery(() => roleQueries.catalog());
  const member = $derived(accessQuery.data?.member);

  const name = $derived(member?.displayName ?? '');
  $effect(() => {
    setMemberCrumbName(name || undefined);
    return () => setMemberCrumbName(undefined);
  });

  interface RoleGroup {
    key: string;
    label: string;
    roles: MemberRoleEntity[];
  }

  /** The instance first, then the workspace, then each project. */
  const groups = $derived.by((): RoleGroup[] => {
    const roles = member?.roles ?? [];
    const of = (kind: MemberRoleEntity['scopeKind']) =>
      roles.filter(role => role.scopeKind === kind);
    const list: RoleGroup[] = [
      { key: 'platform', label: t(membershipMessages.instance), roles: of('platform') },
      { key: 'workspace', label: workspaceName, roles: of('workspace') },
    ];
    const byProject = [...new Set(of('project').map(role => role.scopeId))];
    for (const id of byProject) {
      const inProject = of('project').filter(role => role.scopeId === id);
      list.push({ key: id, label: inProject[0]?.scopeName ?? '', roles: inProject });
    }
    return list;
  });

  const canManage = $derived(
    workspaceId ? can(Permission.MANAGE_WORKSPACE_GRANTS, { workspaceId }) : false,
  );
  let changing = $state(false);
  const workspaceRoles = $derived(
    (member?.roles ?? []).filter(role => role.scopeKind === 'workspace'),
  );
</script>

<div class="flex w-full flex-col gap-6">
  <button
    type="button"
    class="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    onclick={() => navigateTo(listUrl)}
  >
    <ChevronLeftIcon class="size-4" />
    {t(membershipMessages.members)}
  </button>

  {#if accessQuery.isLoading || catalogQuery.isLoading}
    <ListSkeleton header rows={8} rowClass="h-12 w-full" />
  {:else if accessQuery.isError || !member}
    <ErrorState message={t(membershipMessages.memberNotFound)} />
  {:else}
    <header class="flex items-start justify-between gap-6">
      <div class="flex flex-col gap-2">
        <h1 class="text-3xl font-semibold tracking-tight">{name}</h1>
        <p class="max-w-3xl text-sm text-muted-foreground">{t(whatCanDo(name))}</p>
      </div>
      {#if canManage}
        <Button onclick={() => (changing = true)}>{t(membershipMessages.changeRoles)}</Button>
      {/if}
    </header>

    <div class="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside class="rounded-2xl border bg-card">
        <div class="border-b p-5">
          <h2 class="font-semibold">{t(membershipMessages.theirRoles)}</h2>
          <p class="mt-1 text-xs text-muted-foreground">{t(membershipMessages.theirRolesHint)}</p>
        </div>
        {#each groups as group (group.key)}
          <div class="border-b p-5 last:border-b-0">
            <span class="rounded-full bg-muted px-2.5 py-0.5 text-xs">{group.label}</span>
            {#if group.roles.length === 0}
              <p class="mt-2 text-xs text-muted-foreground">
                {group.key === 'platform'
                  ? t(membershipMessages.noInstanceRole)
                  : t(membershipMessages.noRole)}
              </p>
            {:else}
              <ul class="mt-2 flex flex-col gap-1.5">
                {#each group.roles as role (role.role)}
                  <li class="flex items-center justify-between gap-2 text-xs">
                    <span class="rounded-full border bg-muted px-2.5 py-0.5 font-medium">
                      {memberRoleName(role)}
                    </span>
                    <span class="text-muted-foreground">{t(membershipMessages.direct)}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
      </aside>

      <section class="overflow-hidden rounded-2xl border bg-card">
        <div class="flex items-start justify-between gap-4 p-5">
          <div>
            <h2 class="text-xl font-semibold">{t(membershipMessages.effectiveAccess)}</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              {t(effectiveHint(scopeName))}
            </p>
          </div>
          <Select type="single" value={scopeId} onValueChange={next => (scopeId = next)}>
            <SelectTrigger class="w-56" aria-label={t(membershipMessages.scope)}>
              {scopeId ? t(projectOption(scopeName)) : t(workspaceOption(workspaceName))}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" label={t(workspaceOption(workspaceName))}>
                {t(workspaceOption(workspaceName))}
              </SelectItem>
              {#each projects as project (project.id)}
                <SelectItem value={project.id} label={t(projectOption(project.name))}>
                  {t(projectOption(project.name))}
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>
        <EffectiveAccessTable
          areas={catalogQuery.data ?? []}
          level={scopeId ? 'project' : 'workspace'}
          scopeId={scopeId || (workspaceId ?? '')}
          {scopeName}
          sources={accessQuery.data?.sources ?? new Map()}
          holder={member.actorKind === 'user' ? 'people' : 'apps'}
          {slug}
        />
      </section>
    </div>

    {#if workspaceId}
      <ChangeRolesDialog
        {...changing ? { actorId, holder: member.actorKind === 'user' ? 'people' : 'apps' } : {}}
        {name}
        roles={workspaceRoles}
        {workspaceId}
        object={workspaceRef(workspaceId)}
        onClose={() => (changing = false)}
        onChanged={() => void accessQuery.refetch()}
      />
    {/if}
  {/if}
</div>
