<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { createQuery, routeParams, routePathname } from '@scylla/core-sdk';
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { rolesMessages } from '../../messages/roles.messages.ts';
  import { roleName } from '../../role-labels.ts';
  import { setRoleCrumbName } from '../../role-crumb.state.svelte.ts';
  import { roleQueries } from '../../roles.queries.ts';
  import RoleEditor from '../RoleEditor/RoleEditor.svelte';
  import RoleReadOnly from './RoleReadOnly.svelte';

  let { workspaceId }: { workspaceId?: string } = $props();

  const key = $derived(routeParams().roleKey ?? '');
  const listUrl = $derived(routePathname().split('/').slice(0, -1).join('/'));

  const roleQuery = createQuery(() => ({
    ...roleQueries.byKey(key, workspaceId),
    enabled: key.length > 0,
  }));
  const role = $derived(roleQuery.data);

  $effect(() => {
    setRoleCrumbName(role ? roleName(role) : undefined);
    return () => setRoleCrumbName(undefined);
  });

  const editable = $derived(
    role !== undefined &&
      !role.builtin &&
      (workspaceId
        ? role.workspaceId === workspaceId && can(Permission.MANAGE_WORKSPACE_ROLES, { workspaceId })
        : can(Permission.MANAGE_ROLES)),
  );
  const canManage = $derived(
    workspaceId ? can(Permission.MANAGE_WORKSPACE_ROLES, { workspaceId }) : can(Permission.MANAGE_ROLES),
  );
  const duplicateUrl = $derived(
    canManage ? `${listUrl}/new?from=${encodeURIComponent(key)}` : undefined,
  );
  const canSeeHolders = $derived(
    workspaceId ? can(Permission.LIST_WORKSPACE_MEMBERS, { workspaceId }) : can(Permission.LIST_ROLES),
  );
</script>

{#if roleQuery.isLoading}
  <ListSkeleton header rows={8} rowClass="h-12 w-full" />
{:else if roleQuery.isError || !role}
  <ErrorState message={t(rolesMessages.notFound)} />
{:else if editable}
  {#key role.key}
    <RoleEditor {role} {listUrl} {workspaceId} />
  {/key}
{:else}
  <RoleReadOnly {role} {listUrl} {duplicateUrl} {workspaceId} {canSeeHolders} />
{/if}
