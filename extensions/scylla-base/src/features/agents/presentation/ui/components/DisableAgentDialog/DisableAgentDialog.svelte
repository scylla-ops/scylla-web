<script lang="ts">
  import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
    Button,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
  import AlertDialogCloseButton from '../AlertDialogCloseButton.svelte';
  import DialogFooterBand from '../DialogFooterBand.svelte';
  import { disableAgentMessages as messages } from '@base/features/agents/presentation/messages/disable-agent.messages.ts';

  interface Props {
    /** Open while set. */
    agent: AgentEntity | null;
    isPending?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }

  let { agent, isPending = false, onCancel, onConfirm }: Props = $props();

  const CONSEQUENCES = [messages.backToQueue, messages.canOrphan, messages.keepsGrants];
</script>

<AlertDialog
  open={agent !== null}
  onOpenChange={open => {
    if (!open) onCancel();
  }}
>
  <AlertDialogContent class="gap-0 overflow-hidden p-0 sm:max-w-[520px]">
    <AlertDialogCloseButton onclick={onCancel} disabled={isPending} />
    <div data-dialog-part="header" class="flex flex-col gap-2 px-6 pt-6 pr-12">
      <AlertDialogTitle>{t(messages.title(agent?.name ?? ''))}</AlertDialogTitle>
      <AlertDialogDescription>{t(messages.body)}</AlertDialogDescription>
    </div>
    <div data-dialog-part="body" class="px-6 py-5">
      <ul class="flex list-disc flex-col gap-2 rounded-lg bg-muted/60 py-3 pr-4 pl-8 text-sm">
        {#each CONSEQUENCES as consequence (consequence)}
          <li>{t(consequence)}</li>
        {/each}
      </ul>
    </div>
    <DialogFooterBand>
      <AlertDialogCancel class="mt-0" onclick={onCancel} disabled={isPending}>
        {t(messages.cancel)}
      </AlertDialogCancel>
      <Button variant="destructive" onclick={onConfirm} disabled={isPending}>
        {t(messages.confirm)}
      </Button>
    </DialogFooterBand>
  </AlertDialogContent>
</AlertDialog>
