<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { appQueries } from '@base/features/apps';
  import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
  import AccessBadges from '@base/features/agents/presentation/ui/Agents/AccessBadges.svelte';
  import AccessCard from './AccessCard.svelte';

  interface Props {
    agent: AgentEntity;
    organizationId: string;
    /** Also the badge of the agents list, on its own observer of the same entry. */
    listEntry?: boolean;
  }

  let { agent, organizationId, listEntry = false }: Props = $props();

  const accessQuery = createQuery(() => appQueries.accessOf(agent.id));
  const listQuery = createQuery(() => appQueries.accessOf(agent.id));
</script>

<!-- The card on the query of the page, as the page renders it. -->
<AccessCard {agent} access={accessQuery.data} loading={accessQuery.isLoading} {organizationId} />
{#if listEntry}
  <div data-testid="list-entry">
    <AccessBadges access={listQuery.data ?? []} {organizationId} />
  </div>
{/if}
