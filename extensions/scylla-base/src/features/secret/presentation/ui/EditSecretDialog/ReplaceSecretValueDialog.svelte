<script lang="ts">
  import { Permission, can } from '@platform/authz';
  import { createQuery } from '@scylla/core-sdk';
  import { secretQueries } from '@base/features/secret/presentation/secret.queries.ts';
  import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { editSecretMessages as messages } from '@base/features/secret/presentation/messages/edit-secret.messages.ts';

  interface Props {
    open: boolean;
    projectId: string;
    secretName: string;
    onCancel: () => void;
    onConfirm: () => void;
  }

  let { open, projectId, secretName, onCancel, onConfirm }: Props = $props();

  const canList = $derived(can(Permission.LIST_PIPELINES_BY_PROJECT, { projectId }));
  const usageQuery = createQuery(() => secretQueries.usage(projectId, secretName, open && canList));
  const pipelines = $derived(usageQuery.data?.pipelines ?? []);
  const more = $derived(Math.max(0, (usageQuery.data?.totalCount ?? 0) - pipelines.length));
</script>

<AlertDialog
  {open}
  onOpenChange={next => {
    if (!next) onCancel();
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t(messages.replaceTitle(secretName))}</AlertDialogTitle>
      <AlertDialogDescription>{t(messages.valueLost)}</AlertDialogDescription>
    </AlertDialogHeader>
    <div class="flex flex-col gap-3 text-sm">
      <p>{t(messages.nextRun)}</p>
      {#if !canList}
        <p class="text-muted-foreground">{t(messages.usageDenied)}</p>
      {:else if usageQuery.isError}
        <p class="text-destructive">{t(messages.usageFailed)}</p>
      {:else if usageQuery.data}
        {#if pipelines.length === 0}
          <p class="text-muted-foreground">{t(messages.noPipeline)}</p>
        {:else}
          <ul
            aria-label={t(messages.usedBy)}
            class="list-disc rounded-lg bg-muted/60 py-3 pr-4 pl-8"
          >
            {#each pipelines as pipeline (pipeline.id)}
              <li>{pipeline.name}</li>
            {/each}
          </ul>
          {#if more > 0}
            <p class="text-muted-foreground">{t(messages.andMore(more))}</p>
          {/if}
        {/if}
      {:else if usageQuery.isLoading}
        <p class="text-muted-foreground">{t(messages.loading)}</p>
      {/if}
    </div>
    <AlertDialogFooter>
      <AlertDialogCancel onclick={onCancel}>{t(messages.cancel)}</AlertDialogCancel>
      <Button variant="destructive" onclick={onConfirm}>{t(messages.replaceValue)}</Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
