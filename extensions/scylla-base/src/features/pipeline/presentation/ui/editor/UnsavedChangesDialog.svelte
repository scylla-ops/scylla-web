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
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

  interface Props {
    open: boolean;
    onStay: () => void;
    onLeave: () => void;
  }

  let { open, onStay, onLeave }: Props = $props();
</script>

<AlertDialog
  {open}
  onOpenChange={next => {
    if (!next) onStay();
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t(pipelineMessages.leaveTitle)}</AlertDialogTitle>
      <AlertDialogDescription>{t(pipelineMessages.leaveBody)}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter class="gap-2">
      <AlertDialogAction variant="outline" onclick={onStay}>
        {t(pipelineMessages.leaveStay)}
      </AlertDialogAction>
      <AlertDialogAction variant="destructive" onclick={onLeave}>
        {t(pipelineMessages.leaveAnyway)}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
