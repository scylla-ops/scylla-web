<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { Button, Card, Skeleton } from '@scylla/ui/primitives';
  import { ErrorState, FeatureHeader } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    createAgentActions,
  } from '@base/features/agents/presentation/ui/components/agent-actions.state.svelte.ts';
  import {
    createAgentsPage,
  } from './agents-page.state.svelte.ts';
  import AgentActionDialogs from '../components/AgentActionDialogs.svelte';
  import AgentBot from '../components/AgentBot/AgentBot.svelte';
  import CreateAgentDialog from '../components/CreateAgentDialog/CreateAgentDialog.svelte';
  import { agentsMessages } from '@base/features/agents/presentation/messages/agents.messages.ts';
  import AgentFilters from './AgentFilters.svelte';
  import AgentList from './AgentList.svelte';
  import AgentsSummary from './AgentsSummary.svelte';
  import { agentsPageMessages as messages } from '@base/features/agents/presentation/messages/agents-page.messages.ts';

  const page = createAgentsPage();
  const actions = createAgentActions();

  let createOpen = $state(false);
</script>

{#snippet subtitle()}
  <p class="text-sm text-muted-foreground">{t(messages.subtitle)}</p>
{/snippet}

{#if page.isError}
  <ErrorState message={t(messages.loadError)} />
{:else}
  <div data-tour="agents" class="flex w-full flex-col gap-5 pb-8">
    <FeatureHeader
      label={t(agentsMessages.agents)}
      underLabel={subtitle}
      onNew={() => (createOpen = true)}
      newLabel={t(messages.newAgent)}
      newIcon={PlusIcon}
      canNew={page.canCreate}
      newDeniedReason={t(messages.createDenied)}
    />

    {#if page.isLoading}
      <Skeleton class="h-28 w-full rounded-xl" />
      <Skeleton class="h-72 w-full rounded-xl" />
    {:else if page.agents.length === 0}
      <div class="flex flex-1 items-center justify-center py-10">
        <Card class="flex max-w-sm flex-col items-center gap-3 p-8 text-center">
          <AgentBot state="never" size="lg" />
          <h2 class="text-lg font-semibold">{t(messages.noAgentYet)}</h2>
          <p class="text-sm text-muted-foreground">{t(messages.noAgentBody)}</p>
          {#if page.canCreate}
            <Button onclick={() => (createOpen = true)}>
              <PlusIcon />
              {t(messages.createFirstAgent)}
            </Button>
          {/if}
        </Card>
      </div>
    {:else}
      <AgentsSummary
        summary={page.summary}
        canReadStats={page.canReadStats}
        statsLoading={page.statsLoading}
        statsFailed={page.statsFailed}
      />
      <AgentFilters
        filter={page.filter}
        counts={page.counts}
        search={page.search}
        onFilterChange={filter => (page.filter = filter)}
        onSearchChange={search => (page.search = search)}
      />
      <AgentList
        rows={page.rows}
        organizationId={page.organizationId}
        now={page.now}
        {actions}
        canReadStats={page.canReadStats}
        canReadAccess={page.canReadAccess}
      />
    {/if}

    <CreateAgentDialog open={createOpen} onClose={() => (createOpen = false)} />

    <AgentActionDialogs {actions} />
  </div>
{/if}
