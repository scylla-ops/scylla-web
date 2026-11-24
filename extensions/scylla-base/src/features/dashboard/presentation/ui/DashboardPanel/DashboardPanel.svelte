<script lang="ts">
  import { dashboardEditor } from '@base/features/dashboard/presentation/ui/dashboard-editor.state.svelte.ts';
  import EditPanel from './EditPanel.svelte';
  import ViewPanel from './ViewPanel.svelte';
</script>

<div data-slot="dashboard-panel" class="flex min-h-0 flex-1 flex-col">
  {#if dashboardEditor.active}
    <EditPanel />
  {:else}
    <ViewPanel />
  {/if}
</div>
