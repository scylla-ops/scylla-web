<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { navigateTo, routePathname } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { rolesMessages } from '../../messages/roles.messages.ts';
  import RolesList from '../components/RolesList.svelte';
</script>

<div class="flex w-full flex-col gap-6">
  <header class="flex items-start justify-between gap-6">
    <div class="flex flex-col gap-2">
      <h1>{t(rolesMessages.roles)}</h1>
      <p class="max-w-3xl text-sm text-muted-foreground">{t(rolesMessages.instanceHint)}</p>
    </div>
    {#if can(Permission.MANAGE_ROLES)}
      <Button onclick={() => navigateTo(`${routePathname()}/new`)}>
        {t(rolesMessages.newRole)}
      </Button>
    {/if}
  </header>
  <RolesList />
</div>
