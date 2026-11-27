<script lang="ts">
  import type { AgentPage } from '../agent-page.state.svelte.ts';
  import AgentKeysCard from '../AgentKeysCard.svelte';
  import AgentMachineCard from '../AgentMachineCard/AgentMachineCard.svelte';
  import AgentUninstallCard from './AgentUninstallCard.svelte';

  let { page }: { page: AgentPage } = $props();

  const agent = $derived(page.agent!);
</script>

<!-- The machine of the agent, the keys of its machines, and how to remove it from them. -->
<div class="flex flex-col gap-4">
  <AgentMachineCard {agent} />
  <AgentKeysCard
    agentId={agent.id}
    keys={page.keys}
    onNewCode={page.canNewCode && !agent.disabledAt ? page.connect : undefined}
    canRename={page.canRename}
    canRevoke={page.canRevoke}
  />
  {#if agent.host?.os}
    <AgentUninstallCard os={agent.host.os} />
  {/if}
</div>
