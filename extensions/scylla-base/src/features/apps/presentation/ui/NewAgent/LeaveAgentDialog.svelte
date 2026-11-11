<script lang="ts">
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    open: boolean;
    name: string;
    deleting: boolean;
    onStay: () => void;
    onKeep: () => void;
    onDelete: () => void;
  }

  let { open, name, deleting, onStay, onKeep, onDelete }: Props = $props();
</script>

<AlertDialog
  {open}
  onOpenChange={next => {
    if (!next) onStay();
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t(messages.leaveTitle(name))}</AlertDialogTitle>
      <AlertDialogDescription>{t(messages.leaveBody)}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter class="gap-2 sm:justify-between sm:space-x-0">
      <AlertDialogAction variant="ghost" disabled={deleting} onclick={onStay}>
        {t(messages.stay)}
      </AlertDialogAction>
      <div class="flex flex-col-reverse gap-2 sm:flex-row">
        <AlertDialogAction variant="outline" disabled={deleting} onclick={onKeep}>
          {t(messages.keepAgent)}
        </AlertDialogAction>
        <AlertDialogAction variant="destructive" disabled={deleting} onclick={onDelete}>
          {t(messages.deleteAgent)}
        </AlertDialogAction>
      </div>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
