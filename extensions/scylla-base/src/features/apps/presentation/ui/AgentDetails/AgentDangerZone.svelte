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
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { appPageMessages } from '@base/features/apps/presentation/messages/app-page.messages.ts';

  interface Props {
    agentId: string;
    agentName: string;
    onDeleted: () => void;
    /** The texts of another app. */
    app?: boolean;
  }

  let { agentId, agentName, onDeleted, app = false }: Props = $props();

  const title = $derived(app ? t(appPageMessages.dangerTitle) : t(messages.dangerTitle));
  const body = $derived(app ? t(appPageMessages.dangerBody) : t(messages.dangerBody));
  const button = $derived(app ? t(appPageMessages.deleteApp) : t(messages.deleteAgent));
  const dialogBody = $derived(app ? t(appPageMessages.dangerBody) : t(messages.deleteBody));

  const remove = createMutation(() => appMutations.remove());

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
    <h2 class="text-sm font-medium">{title}</h2>
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
