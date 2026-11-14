<script lang="ts">
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
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
  import { pipelineSourceMessages as messages } from '@base/features/integrations/presentation/messages/pipeline-source.messages.ts';
  import { repositoryMessages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import { hasBlockingIssues } from '@base/features/integrations/presentation/presenters/pipeline-files.presenter.ts';
  import PipelineFileList from './PipelineFileList.svelte';
  import type { PipelineSourceState } from './pipeline-source.state.svelte.ts';

  interface Props {
    source: PipelineSourceState;
    /** The default branch. */
    branch: string;
  }

  let { source, branch }: Props = $props();

  const toFiles = $derived(source.target === 'file');
  const files = $derived(source.filesQuery.data);
  const note = $derived.by(() => {
    if (!toFiles || !files) return '';
    if (files.files.length === 0) return t(messages.toFilesEmpty);
    return hasBlockingIssues(files) ? t(messages.toFilesErrors) : '';
  });
</script>

<!-- The state owns `open`: the dialog stays open and disabled until the move settles. -->
<AlertDialog
  open={source.open}
  onOpenChange={open => {
    if (!open) source.cancel();
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {t(toFiles ? messages.toFilesTitle : messages.toEditorTitle)}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {toFiles ? t(messages.toFilesBody(branch)) : t(messages.toEditorBody)}
      </AlertDialogDescription>
    </AlertDialogHeader>
    {#if toFiles}
      <div class="rounded-lg border p-3">
        <PipelineFileList {files} failed={source.filesQuery.isError} {branch} />
      </div>
      {#if note}
        <p class="text-sm text-muted-foreground">{note}</p>
      {/if}
    {/if}
    {#if source.error}
      <p role="alert" class="flex items-center gap-2 text-sm">
        <TriangleAlertIcon class="size-4 shrink-0 text-warning" aria-hidden="true" />
        {source.error}
      </p>
    {/if}
    <AlertDialogFooter>
      <AlertDialogCancel onclick={source.cancel} disabled={source.pending}>
        {t(repositoryMessages.cancel)}
      </AlertDialogCancel>
      <AlertDialogAction
        onclick={source.confirm}
        disabled={source.pending || (toFiles && source.filesQuery.isPending)}
      >
        {t(toFiles ? messages.useFiles : messages.useEditor)}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
