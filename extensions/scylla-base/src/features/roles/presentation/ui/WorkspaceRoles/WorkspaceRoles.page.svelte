<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { navigateTo, routePathname } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { rolesMessages, workspaceRolesHint } from '../../messages/roles.messages.ts';
  import RolesNoAccess from '../components/RolesNoAccess.svelte';
  import WorkspaceRolesList from '../components/WorkspaceRolesList.svelte';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const workspaceName = $derived(context().workspace.name ?? '');
  const canManage = $derived(
    workspaceId ? can(Permission.MANAGE_WORKSPACE_ROLES, { workspaceId }) : false,
  );
</script>

{#if workspaceId && !canManage}
  <RolesNoAccess {workspaceId} {workspaceName} />
{:else if workspaceId}
  <div class="flex w-full flex-col gap-6 pb-20">
    <header class="flex items-start justify-between gap-6">
      <div class="flex flex-col gap-2">
        <h1>{t(rolesMessages.roles)}</h1>
        <p class="max-w-3xl text-sm text-muted-foreground">
          {t(workspaceRolesHint(workspaceName, workspaceName))}
        </p>
      </div>
      <span class="contents" data-tour="role-new">
        <Button onclick={() => navigateTo(`${routePathname()}/new`)}>
          {t(rolesMessages.newRole)}
        </Button>
      </span>
    </header>
    <div class="contents" data-tour="roles-list">
      <WorkspaceRolesList {workspaceId} {workspaceName} />
    </div>
  </div>
{/if}
