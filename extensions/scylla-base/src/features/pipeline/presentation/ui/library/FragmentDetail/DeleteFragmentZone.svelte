<script lang="ts">
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { ConfirmOperationAlertDialog, DangerZone } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import type { FragmentDetail } from './fragment-detail.state.svelte.ts';

  let { detail }: { detail: FragmentDetail } = $props();

  let confirming = $state(false);

  const fragment = $derived(detail.fragment!);
  const usages = $derived(fragment.usages.length);
  // What a deletion breaks: the pipelines that link the fragment stop getting its versions.
  const consequence = $derived(
    t(usages ? libraryMessages.deleteUsed(usages) : libraryMessages.deleteUnused),
  );
</script>

<DangerZone
  title={t(libraryMessages.deleteTitle)}
  description={detail.deleteIssue ? t(libraryMessages.deletePublic) : consequence}
>
  {#snippet action()}
    <Button
      variant="destructive"
      disabled={!!detail.deleteIssue || detail.deleting}
      onclick={() => (confirming = true)}
    >
      <Trash2Icon class="size-4" />
      {t(libraryMessages.deleteAction)}
    </Button>
  {/snippet}
</DangerZone>

<ConfirmOperationAlertDialog
  open={confirming}
  onOpenChange={open => (confirming = open)}
  title={t(libraryMessages.deleteConfirmTitle(fragment.name))}
  description={consequence}
  continueLabel={t(libraryMessages.deleteAction)}
  isLoading={detail.deleting}
  onContinue={() => detail.remove(() => (confirming = false))}
/>
