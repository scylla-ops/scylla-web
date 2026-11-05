<script lang="ts">
  import LockIcon from '@lucide/svelte/icons/lock';
  import { can, Permission } from '@platform/authz';
  import { createQuery } from '@scylla/core-sdk';
  import { accessQueries, workspaceRef } from '@base/features/access';
  import { t } from '@scylla/ui/i18n';
  import { noAccessTitle, rolesMessages } from '../../messages/roles.messages.ts';

  let { workspaceId, workspaceName }: { workspaceId: string; workspaceName: string } = $props();

  const membersQuery = createQuery(() =>
    accessQueries.members(workspaceRef(workspaceId), {
      enabled: can(Permission.LIST_WORKSPACE_MEMBERS, { workspaceId }),
    }),
  );

  const givers = $derived(
    (membersQuery.data ?? []).filter(member =>
      member.roles.some(role =>
        ['owner', 'workspace-admin', 'instance-admin'].includes(role.roleKey),
      ),
    ),
  );
</script>

<div class="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center">
  <LockIcon class="size-6 text-muted-foreground" />
  <h1 class="text-xl font-semibold">{t(noAccessTitle(workspaceName))}</h1>
  <p class="max-w-md text-sm text-muted-foreground">{t(rolesMessages.noAccessHint)}</p>
  {#if givers.length > 0}
    <ul class="flex flex-col gap-1 text-sm">
      {#each givers.slice(0, 5) as giver (giver.actorId)}
        <li>{giver.displayName}</li>
      {/each}
    </ul>
  {:else}
    <p class="text-sm">{t(rolesMessages.noAccessGivers)}</p>
  {/if}
  <p class="text-xs text-muted-foreground">{t(rolesMessages.noAccessLink)}</p>
</div>
