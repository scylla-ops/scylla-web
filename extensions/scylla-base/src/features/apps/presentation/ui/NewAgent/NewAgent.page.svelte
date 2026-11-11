<script lang="ts">
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { contextStore, scyllaNavigate } from '@platform/context';
  import { ErrorState } from '@scylla/ui';
  import { Button, Skeleton } from '@scylla/ui/primitives';
  import { createNow } from '@scylla/ui/state';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import {
    type InstallWay,
    secondsLeft,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import { agentPageMessages as pageMessages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import AgentStep from './AgentStep.svelte';
  import ConnectedStep from './ConnectedStep.svelte';
  import InstallStep from './InstallStep/InstallStep.svelte';
  import LeaveAgentDialog from './LeaveAgentDialog.svelte';
  import LiveStatus from './LiveStatus.svelte';
  import NameStep from './NameStep.svelte';
  import { INSTALL_WAYS } from './install-ways.registry.ts';
  import { createLeavePrompt } from './leave-prompt.state.svelte.ts';
  import { createNewAgent } from './new-agent.state.svelte.ts';

  let { appId = '' }: { appId?: string } = $props();

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');

  const page = createNewAgent(() => ({ workspaceId, appId }));
  const prompt = createLeavePrompt(() => ({
    active: page.waitsForMachine,
    agent: page.agent,
    deleting: page.deleting,
    remove: page.remove,
  }));
  const now = createNow(() => page.step === 'install');

  let way = $state<InstallWay>('linux');

  const step = $derived(page.step);
  const name = $derived(page.agent?.name ?? '');
  const access = $derived(
    page.projectCount === null
      ? ''
      : page.projectCount === 0
        ? t(messages.allProjects)
        : t(messages.projectCount(page.projectCount)),
  );
  const title = $derived(
    !page.agent || page.firstMachine ? t(messages.pageTitle) : t(messages.installTitle(name)),
  );
  const expired = $derived(
    !!page.joinCode && secondsLeft(page.joinCode.expiresAt, new Date(now.value)) <= 0,
  );

  const toAgents = () => scyllaNavigate.goToWorkspaceRoute('/agents');
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-20" data-tour="add-agent-page">
  <header class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex min-w-0 flex-col gap-1">
      <h1 class="break-words">{title}</h1>
      <p class="text-sm text-muted-foreground">{t(messages.blurb)}</p>
    </div>
    <Button variant="outline" onclick={toAgents}>
      {step === 'connected' ? t(messages.backToAgents) : t(messages.cancel)}
    </Button>
  </header>

  {#if page.failed}
    <ErrorState />
  {:else}
    <ol class="flex flex-col">
      <AgentStep
        number={1}
        state={step === 'name' ? 'current' : 'done'}
        title={t(messages.stepName)}
        summary={step === 'name' || !name ? undefined : [name, access].filter(Boolean).join(' · ')}
        open={step === 'name'}
      >
        <NameStep
          {workspaceId}
          bind:name={page.name}
          bind:projectIds={page.projectIds}
          bind:someProjects={page.someProjects}
          canAdd={page.canAdd}
          onAdd={page.add}
        />
      </AgentStep>

      <AgentStep
        number={2}
        state={step === 'name' ? 'todo' : step === 'install' ? 'current' : 'done'}
        title={t(messages.stepInstall)}
        summary={step === 'install'
          ? t(messages.runThis)
          : step === 'connected'
            ? `${t(INSTALL_WAYS[way].label)} · ${t(INSTALL_WAYS[way].tool)}`
            : undefined}
        open={step === 'install'}
      >
        <div class="flex flex-col gap-4">
          {#if !page.accessGranted}
            <div
              class="flex items-start gap-3 rounded-lg border border-warning/60 bg-warning/10 p-3"
              role="alert"
            >
              <TriangleAlertIcon class="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <div class="flex flex-col gap-1">
                <p class="text-sm font-medium">{t(pageMessages.addedWithoutAccess)}</p>
                <p class="text-xs text-muted-foreground">
                  {t(pageMessages.addedWithoutAccessBody(name))}
                </p>
              </div>
            </div>
          {/if}
          {#if page.joinCode}
            <InstallStep
              joinCode={page.joinCode}
              now={now.value}
              onNewCode={page.newCode}
              renewing={page.renewing}
              bind:way
            />
          {:else}
            <Skeleton class="h-64 w-full rounded-lg" />
          {/if}
        </div>
      </AgentStep>

      <AgentStep
        number={3}
        state={step === 'connected' ? 'done' : 'todo'}
        title={step === 'connected' ? t(messages.onlineTitle(name)) : t(messages.stepConnected)}
        open={(step === 'install' && !!page.joinCode) || (step === 'connected' && !!page.agent)}
        last
      >
        {#if step === 'connected' && page.agent}
          <ConnectedStep
            app={page.agent}
            projectCount={page.projectCount}
            onOpen={() => scyllaNavigate.goToAgentDetails(page.agent?.id ?? '')}
            onAddAnother={() => scyllaNavigate.goToWorkspaceRoute('/agents/new')}
          />
        {:else}
          <LiveStatus {way} joined={page.joining} {expired} now={now.value} />
        {/if}
      </AgentStep>
    </ol>
  {/if}
</div>

<LeaveAgentDialog
  open={prompt.open}
  {name}
  deleting={prompt.deleting}
  onStay={prompt.stay}
  onKeep={prompt.keep}
  onDelete={prompt.delete}
/>
