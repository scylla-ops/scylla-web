<script lang="ts">
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** For example acme/api. */
    name: string;
    /** What stops, one line each. */
    stops: string[];
    loading: boolean;
    onContinue: () => void;
  }

  let { open, onOpenChange, name, stops, loading, onContinue }: Props = $props();
</script>

<!-- The parent owns `open`: the dialog stays open and disabled until the unlink settles. -->
<AlertDialog {open} {onOpenChange}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t(messages.unlinkTitle(name))}</AlertDialogTitle>
      <AlertDialogDescription>{t(messages.unlinkBody)}</AlertDialogDescription>
    </AlertDialogHeader>
    <ul class="flex list-disc flex-col gap-1.5 pl-5 text-sm">
      {#each stops as stop (stop)}
        <li>{stop}</li>
      {/each}
    </ul>
    <AlertDialogFooter>
      <AlertDialogCancel onclick={() => onOpenChange(false)} disabled={loading}>
        {t(messages.cancel)}
      </AlertDialogCancel>
      <AlertDialogAction variant="destructive" onclick={onContinue} disabled={loading}>
        {t(messages.unlink)}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
