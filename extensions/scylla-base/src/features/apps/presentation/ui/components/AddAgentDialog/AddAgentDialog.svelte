<script lang="ts">
  import { fly } from 'svelte/transition';
  import { scyllaNavigate } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { CreatedApp, JoinCode } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations, appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import StepBar from './StepBar.svelte';
  import NameStep from './NameStep.svelte';
  import InstallStep from './InstallStep.svelte';
  import ConnectedStep from './ConnectedStep.svelte';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    workspaceId: string;
  }

  let { open, setOpen, workspaceId }: Props = $props();

  const create = createMutation(() => appMutations.create(workspaceId));
  const renew = createMutation(() => appMutations.joinCode());

  let name = $state('');
  let projectIds = $state<string[]>([]);
  let someProjects = $state(false);
  let created = $state<CreatedApp | null>(null);
  let joinCode = $state<JoinCode | null>(null);

  const watched = createQuery(() => appQueries.waiting(created?.app.id ?? '', workspaceId));
  const connected = $derived(watched.data?.app.connected === true);
  const step = $derived(!created ? 0 : connected ? 2 : 1);
  const chosen = $derived(someProjects ? projectIds : []);
  const canAdd = $derived(!!name.trim() && (!someProjects || projectIds.length > 0));

  const STEPS = $derived([t(messages.stepName), t(messages.stepInstall), t(messages.stepConnected)]);
  const title = $derived(
    step === 0
      ? t(messages.title)
      : step === 1
        ? t(messages.installTitle(created?.app.name ?? ''))
        : t(messages.onlineTitle(created?.app.name ?? '')),
  );

  const close = () => {
    setOpen(false);
    name = '';
    projectIds = [];
    someProjects = false;
    created = null;
    joinCode = null;
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

    <form id="add-agent" class="contents" onsubmit={submit}>
      {#key step}
        <div in:fly={{ x: 24, duration: 220 }}>
          {#if step === 0}
            <NameStep {workspaceId} bind:name bind:projectIds bind:someProjects />
          {:else if step === 1 && joinCode}
            <InstallStep {joinCode} onNewCode={newCode} renewing={renew.isPending} />
          {:else if step === 2 && watched.data}
            <ConnectedStep app={watched.data.app} projectCount={chosen.length} />
          {/if}
        </div>
      {/key}
    </form>

    <DialogFooter class="items-center border-t pt-4 sm:justify-between">
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
          <Button onclick={openAgent}>{t(messages.openAgent)}</Button>
        {/if}
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
