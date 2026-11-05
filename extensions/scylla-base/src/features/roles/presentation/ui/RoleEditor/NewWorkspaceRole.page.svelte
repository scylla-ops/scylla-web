<script lang="ts">
  import { contextStore } from '@platform/context';
  import { currentSearch, routePathname } from '@scylla/core-sdk';
  import { toRune } from '@scylla/ui/stores';
  import RoleEditor from './RoleEditor.svelte';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const listUrl = $derived(routePathname().split('/').slice(0, -1).join('/'));
  const startKey = new URLSearchParams(currentSearch()).get('from') ?? undefined;
</script>

{#if workspaceId}
  <RoleEditor {listUrl} {startKey} {workspaceId} />
{/if}
