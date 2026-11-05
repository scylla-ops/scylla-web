<script lang="ts">
  import { contextStore } from '@platform/context';
  import { toRune } from '@scylla/ui/stores';
  import RoleDetail from './RoleDetail.svelte';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
</script>

{#if workspaceId}
  <RoleDetail {workspaceId} />
{/if}
