<script lang="ts">
  import { fly } from 'svelte/transition';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { scyllaNavigate } from '@platform/context';
  import { createMutation, createQuery, getQueryClient } from '@scylla/core-sdk';
  import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Skeleton,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type {
    AppEntity,
    CreatedApp,
    JoinCode,
  } from '@base/features/apps/domain/entities/app.entity.ts';
  import {
    appMutations,
    appQueries,
    hasJoined,
    isJoining,
  } from '@base/features/apps/presentation/apps.queries.ts';
  import StepBar from './StepBar.svelte';
  import NameStep from './NameStep.svelte';
  import InstallStep from './InstallStep.svelte';
  import ConnectedStep from './ConnectedStep.svelte';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import { agentPageMessages as pageMessages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    workspaceId: string;
    /** An agent that a machine joins again: the dialog starts at the install step. */
    agent?: AppEntity | null;
  }

  let { open, setOpen, workspaceId, agent = null }: Props = $props();

  const create = createMutation(() => appMutations.create(workspaceId));
  const renew = createMutation(() => appMutations.joinCode());

  let name = $state('');
  let projectIds = $state<string[]>([]);
  let someProjects = $state(false);
  let created = $state<CreatedApp | null>(null);
  let joinCode = $state<JoinCode | null>(null);
  let keysBefore = $state(0);
  let requested: string | null = null;

  const watched = createQuery(() =>
    appQueries.waiting(created?.app.id ?? '', workspaceId, keysBefore),
  );
  const connected = $derived(hasJoined(watched.data, keysBefore));
  const step = $derived(created ? (connected ? 2 : 1) : agent ? 1 : 0);
  const chosen = $derived(someProjects ? projectIds : []);
  const canAdd = $derived(!!name.trim() && (!someProjects || projectIds.length > 0));
  const agentName = $derived(created?.app.name ?? agent?.name ?? '');

  const STEPS = $derived([t(messages.stepName), t(messages.stepInstall), t(messages.stepConnected)]);
  const title = $derived(
    step === 0
      ? t(messages.title)
      : step === 1
        ? t(messages.installTitle(agentName))
        : t(messages.onlineTitle(agentName)),
  );

  $effect(() => {
    const target = agent;
    if (!open || !target || requested === target.id) return;
    requested = target.id;
    void getQueryClient()
      .fetchQuery(appQueries.byId(target.id, workspaceId))
      .then(details => {
        keysBefore = details.keys.length;
        renew.mutate(target.id, {
          onSuccess: code => {
            created = { app: target, joinCode: code, accessGranted: true };
            joinCode = code;
          },
        });
      });
  });

  const close = () => {
    setOpen(false);
    name = '';
    projectIds = [];
    someProjects = false;
    created = null;
    joinCode = null;
    keysBefore = 0;
    requested = null;
    create.reset();
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!canAdd) return;
    create.mutate(
      { name, runner: true, projectIds: chosen },
      {
        onSuccess: result => {
          created = result;
          joinCode = result.joinCode;
        },
      },
    );
  };

  const newCode = () => {
    if (!created) return;
    renew.mutate(created.app.id, { onSuccess: code => (joinCode = code) });
  };

  const openAgent = () => {
    const id = created?.app.id;
    close();
    if (id) scyllaNavigate.goToWorkspaceRoute(`/agents/${id}`);
  };
</script>

<Dialog
  {open}
  onOpenChange={next => {
    if (!next) close();
  }}
>
  <DialogContent class="gap-5 sm:max-w-xl" data-tour="add-agent-dialog">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
    <StepBar labels={STEPS} current={step} />

    {#if created && !created.accessGranted}
      <div
        class="flex items-start gap-3 rounded-lg border border-warning/60 bg-warning/10 p-3"
        role="alert"
      >
        <TriangleAlertIcon class="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium">{t(pageMessages.addedWithoutAccess)}</p>
          <p class="text-xs text-muted-foreground">
            {t(pageMessages.addedWithoutAccessBody(created.app.name))}
          </p>
        </div>
      </div>
    {/if}

    <form id="add-agent" class="contents" onsubmit={submit}>
      {#key step}
        <div in:fly={{ x: 24, duration: 220 }}>
          {#if step === 0}
            <NameStep {workspaceId} bind:name bind:projectIds bind:someProjects />
          {:else if step === 1 && joinCode}
            <InstallStep
              {joinCode}
              onNewCode={newCode}
              renewing={renew.isPending}
              joined={isJoining(watched.data, keysBefore)}
            />
          {:else if step === 1}
            <Skeleton class="h-40 w-full rounded-lg" />
          {:else if step === 2 && watched.data}
            <ConnectedStep
              app={watched.data.app}
              projectCount={agent ? null : chosen.length}
            />
          {/if}
        </div>
      {/key}
    </form>

    <DialogFooter
      class="items-center border-t pt-4 sm:justify-between"
      data-tour="app-dialog-actions"
    >
      <span class="text-xs text-muted-foreground">{t(messages.stepOf(step + 1))}</span>
      <div class="flex gap-2">
        {#if step === 0}
          <Button variant="outline" onclick={close}>{t(messages.cancel)}</Button>
          <Button type="submit" form="add-agent" disabled={!canAdd || create.isPending}>
            {t(messages.add)}
          </Button>
        {:else if step === 1}
          <Button variant="outline" onclick={close}>{t(messages.close)}</Button>
        {:else}
          <Button variant="outline" onclick={close}>{t(messages.close)}</Button>
          <Button onclick={openAgent} data-tour="agent-open">{t(messages.openAgent)}</Button>
        {/if}
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
