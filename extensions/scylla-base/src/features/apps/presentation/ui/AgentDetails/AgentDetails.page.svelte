<script lang="ts">
  import ActivityIcon from '@lucide/svelte/icons/activity';
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
  import ListChecksIcon from '@lucide/svelte/icons/list-checks';
  import ServerIcon from '@lucide/svelte/icons/server';
  import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
  import { scyllaNavigate } from '@platform/context';
  import { ConfirmOperationAlertDialog, ErrorState, type LucideIcon } from '@scylla/ui';
  import {
    Skeleton,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { MessageDescriptor } from '@lingui/core';
  import { setAppCrumbName } from '@base/features/apps/presentation/app-crumb.state.svelte.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { agentsListMessages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';
  import AppIconDialog from '../components/AppIconCard/AppIconDialog.svelte';
  import DeleteAppDialog from '../components/DeleteAppDialog/DeleteAppDialog.svelte';
  import DisabledBanner from '../components/DisabledBanner.svelte';
  import AgentActivity from './AgentActivity/AgentActivity.svelte';
  import AgentHeader from './AgentHeader.svelte';
  import AgentJobs from './AgentJobs/AgentJobs.svelte';
  import AgentMachine from './AgentMachine/AgentMachine.svelte';
  import AgentOverview from './AgentOverview/AgentOverview.svelte';
  import AgentSettings from './AgentSettings/AgentSettings.svelte';
  import { createAgentPage } from './agent-page.state.svelte.ts';
  import type { AgentTab } from './agent-tab.state.svelte.ts';

  let { appId = '' }: { appId?: string } = $props();

  const page = createAgentPage(() => appId);
  const agent = $derived(page.agent);

  $effect(() => {
    setAppCrumbName(agent?.name || undefined);
    return () => setAppCrumbName(undefined);
  });

  const TABS: Record<AgentTab, { label: MessageDescriptor; icon: LucideIcon }> = {
    overview: { label: messages.overviewTab, icon: LayoutDashboardIcon },
    jobs: { label: messages.jobsTab, icon: ListChecksIcon },
    activity: { label: messages.activityTab, icon: ActivityIcon },
    settings: { label: messages.settingsTab, icon: SlidersHorizontalIcon },
    machine: { label: messages.machine, icon: ServerIcon },
  };

  /** The next step of an agent with no job: connect it, give it access, or run a pipeline. */
  const emptyAction = $derived(
    page.never && page.canNewCode
      ? { label: t(agentsListMessages.finishSetup), onSelect: page.connect }
      : page.access?.kind === 'none' && page.canChangeAccess
        ? { label: t(messages.giveAccess), onSelect: () => page.tab.select('settings') }
        : {
            label: t(messages.openProjects),
            onSelect: () => scyllaNavigate.goToWorkspaceRoute('/projects'),
          },
  );
</script>

{#if page.details.isError}
  <ErrorState message={page.details.error?.message} />
{:else if !agent}
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6" aria-busy="true">
    <div class="flex items-center gap-4">
      <Skeleton class="size-12 rounded-xl" />
      <div class="flex flex-col gap-2">
        <Skeleton class="h-7 w-56" />
        <Skeleton class="h-4 w-72" />
      </div>
    </div>
    <Skeleton class="h-8 w-full rounded-lg sm:w-[30rem]" />
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Skeleton class="h-64 w-full rounded-xl" />
      <Skeleton class="h-64 w-full rounded-xl" />
    </div>
  </div>
{:else}
  <!--
    One column of at most 64 rem, centered. The header and the tabs stay at their place when the
    tab changes: only the content under them changes, and it fades in.
  -->
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-20" data-tour="agent-details">
    <AgentHeader
      {agent}
      noActiveKey={page.noActiveKey}
      onChangeIcon={page.canSetIcon ? () => page.openIcon() : undefined}
      onConnect={page.canNewCode ? page.connect : undefined}
      onDisable={page.canManage ? () => (page.disabling = true) : undefined}
      onEnable={page.canManage ? page.enable : undefined}
      onDelete={page.canManage ? () => (page.deleting = true) : undefined}
    />

    {#if agent.disabledAt}
      <DisabledBanner
        disabledAt={agent.disabledAt}
        body={t(messages.disabledBody)}
        onEnable={page.canManage ? page.enable : undefined}
        enabling={page.isEnabling}
      />
    {/if}

    <Tabs value={page.tab.current} onValueChange={page.tab.select} class="gap-4">
      <TabsList class="h-9 w-full sm:w-fit" aria-label={t(messages.tabsLabel)}>
        {#each page.tabs as tab (tab)}
          {@const Icon = TABS[tab].icon}
          <TabsTrigger value={tab} class="px-1.5 max-sm:text-[13px] sm:px-3">
            <Icon class="max-sm:hidden" aria-hidden="true" />
            {t(TABS[tab].label)}
          </TabsTrigger>
        {/each}
      </TabsList>
      <TabsContent value="overview">
        {#if page.tab.current === 'overview'}
          <AgentOverview {page} {emptyAction} />
        {/if}
      </TabsContent>
      {#if page.canReadJobs}
        <TabsContent value="jobs">
          {#if page.tab.current === 'jobs'}
            <AgentJobs
              workspaceId={page.workspaceId}
              appId={agent.id}
              stats={page.stats.timeline?.stats}
              running={agent.runningJobs}
              {emptyAction}
            />
          {/if}
        </TabsContent>
      {/if}
      {#if page.canReadStats}
        <TabsContent value="activity">
          {#if page.tab.current === 'activity'}
            <AgentActivity
              stats={page.stats}
              lastRunAt={page.recentJobs?.[0]?.createdAt}
              onShowJobs={() => page.tab.select('jobs')}
              {emptyAction}
            />
          {/if}
        </TabsContent>
      {/if}
      <TabsContent value="settings">
        {#if page.tab.current === 'settings'}
          <AgentSettings {page} />
        {/if}
      </TabsContent>
      <TabsContent value="machine">
        {#if page.tab.current === 'machine'}
          <AgentMachine {page} />
        {/if}
      </TabsContent>
    </Tabs>
  </div>

  {#if page.canSetIcon}
    <AppIconDialog
      app={agent}
      open={page.iconOpen}
      onOpenChange={open => (page.iconOpen = open)}
      avatar={page.iconAvatar}
    />
  {/if}

  <DeleteAppDialog
    open={page.deleting}
    onOpenChange={open => (page.deleting = open)}
    appId={agent.id}
    appName={agent.name}
    onDeleted={() => scyllaNavigate.goToWorkspaceRoute('/agents')}
  />

  <ConfirmOperationAlertDialog
    open={page.disabling}
    onOpenChange={open => (page.disabling = open)}
    title={t(messages.disableTitle(agent.name))}
    description={t(messages.disableBody)}
    continueLabel={t(messages.disable)}
    isLoading={page.isDisabling}
    onContinue={page.confirmDisable}
  />
{/if}
