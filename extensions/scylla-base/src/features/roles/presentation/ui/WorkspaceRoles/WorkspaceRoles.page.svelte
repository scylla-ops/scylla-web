<script lang="ts">
  import { contextStore } from '@platform/context';
  import { t } from '@scylla/ui/i18n';
  import { toRune } from '@scylla/ui/stores';
  import { rolesMessages } from '../../messages/roles.messages.ts';
  import RolesList from '../components/RolesList.svelte';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
</script>

<div class="flex w-full flex-col gap-6">
  <header class="flex flex-col gap-2">
    <h1 class="text-3xl font-semibold tracking-tight">{t(rolesMessages.roles)}</h1>
    <p class="max-w-3xl text-sm text-muted-foreground">{t(rolesMessages.workspaceHint)}</p>
  </header>
  {#if workspaceId}
    <RolesList {workspaceId} showHolders={false} />
  {/if}
</div>
