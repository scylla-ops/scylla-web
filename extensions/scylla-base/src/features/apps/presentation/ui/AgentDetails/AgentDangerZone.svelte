<script lang="ts">
  import TrashIcon from '@lucide/svelte/icons/trash';
  import { createMutation } from '@scylla/core-sdk';
  import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { CopyBox } from '@shared/presentation/ui';
  import {
    DOCKER_UNINSTALL_COMMAND,
    uninstallCommand,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import { addAgentMessages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { appPageMessages } from '@base/features/apps/presentation/messages/app-page.messages.ts';

  interface Props {
    agentId: string;
    agentName: string;
    onDeleted: () => void;
    /** The texts of another app. */
    app?: boolean;
    /** The system of the machine of an agent. */
    os?: string;
  }

  let { agentId, agentName, onDeleted, app = false, os }: Props = $props();

  const server: string = import.meta.env.VITE_API_URL || window.location.origin;
  const uninstall = $derived(os ? uninstallCommand(server, os) : null);

  const title = $derived(app ? t(appPageMessages.dangerTitle) : t(messages.dangerTitle));
  const body = $derived(app ? t(appPageMessages.dangerBody) : t(messages.dangerBody));
  const button = $derived(app ? t(appPageMessages.deleteApp) : t(messages.deleteAgent));
  const dialogBody = $derived(app ? t(appPageMessages.dangerBody) : t(messages.deleteBody));

  const remove = createMutation(() => appMutations.remove(app ? 'app' : 'agent'));

  let open = $state(false);
  let typed = $state('');

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (typed !== agentName) return;
    remove.mutate(agentId, {
      onSuccess: () => {
        open = false;
        onDeleted();
      },
    });
  };
</script>

<section
  class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/60 p-5"
>
  <div class="flex flex-col gap-1">
    <h2 class="text-sm">{title}</h2>
    <p class="text-xs text-muted-foreground">{body}</p>
  </div>
  <Button
    variant="destructive"
    onclick={() => {
      typed = '';
      open = true;
    }}
  >
    <TrashIcon class="size-4" aria-hidden="true" />
    {button}
  </Button>
  {#if uninstall}
    <div class="flex w-full flex-col gap-2">
      <p class="text-xs text-muted-foreground">{t(messages.uninstallHint)}</p>
      <CopyBox
        value={uninstall}
        caption={t(messages.installedWithScript)}
        copyToast={t(addAgentMessages.copied)}
      />
      {#if os === 'linux'}
        <CopyBox
          value={DOCKER_UNINSTALL_COMMAND}
          caption={t(messages.runsInDocker)}
          layout="lines"
          copyToast={t(addAgentMessages.copied)}
        />
      {/if}
    </div>
  {/if}
</section>

<Dialog {open} onOpenChange={next => (open = next)}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{t(messages.deleteTitle(agentName))}</DialogTitle>
      <DialogDescription>{dialogBody}</DialogDescription>
    </DialogHeader>
    <form id="delete-agent" class="flex flex-col gap-1.5" onsubmit={submit}>
      <Label for="delete-agent-name">{t(messages.typeToConfirm(agentName))}</Label>
      <Input id="delete-agent-name" bind:value={typed} autocomplete="off" />
    </form>
    <DialogFooter>
      <Button variant="outline" onclick={() => (open = false)}>{t(messages.cancel)}</Button>
      <Button
        type="submit"
        form="delete-agent"
        variant="destructive"
        disabled={typed !== agentName || remove.isPending}
      >
        {t(messages.delete)}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
