<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import FileCodeIcon from '@lucide/svelte/icons/file-code';
  import InfoIcon from '@lucide/svelte/icons/info';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import { ScyllaDialog } from '@scylla/ui';
  import {
    Button,
    DialogFooter,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    PIPELINE_FILE_FORMATS,
    type PipelineFileFormat,
  } from '@base/features/pipeline/domain/structs/pipeline-file-format.struct.ts';
  import { exportMessages } from '@base/features/pipeline/presentation/messages/export.messages.ts';
  import { createExportPipeline } from './export-pipeline.state.svelte.ts';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pipelineId: string;
    pipelineName: string;
    /** The editor has unsaved changes: the file has the saved version only. */
    dirty?: boolean;
  }

  let { open, onOpenChange, pipelineId, pipelineName, dirty = false }: Props = $props();

  const exported = createExportPipeline({ pipelineId: () => pipelineId, open: () => open });
</script>

<ScyllaDialog
  {open}
  {onOpenChange}
  title={pipelineName.trim()
    ? t(exportMessages.title(pipelineName.trim()))
    : t(exportMessages.titleUnnamed)}
  description={t(exportMessages.description)}
  class="sm:max-w-2xl"
>
  <Tabs
    value={exported.format}
    onValueChange={value => exported.setFormat(value as PipelineFileFormat)}
    class="min-w-0 gap-3"
  >
    <TabsList aria-label={t(exportMessages.formats)} class="max-sm:self-center">
      {#each PIPELINE_FILE_FORMATS as format (format)}
        <TabsTrigger value={format} class="px-3">{format.toUpperCase()}</TabsTrigger>
      {/each}
    </TabsList>

    <TabsContent value={exported.format} class="flex min-w-0 flex-col gap-2">
      <!-- The height stays while the file loads, so the box does not move. -->
      <p class="flex min-h-5 items-center gap-2 text-muted-foreground max-sm:justify-center">
        {#if exported.file}
          <FileCodeIcon class="size-4 shrink-0" aria-hidden="true" />
          <span class="truncate font-mono text-xs">{exported.file.path}</span>
        {/if}
      </p>
      <div
        class="relative h-80 overflow-auto rounded-md border bg-muted/50"
        aria-busy={!exported.file && !exported.failed}
      >
        {#if exported.file}
          <pre class="w-max min-w-full p-3 font-mono text-xs">{exported.file.content}</pre>
        {:else if exported.failed}
          <div class="flex h-full flex-col items-center justify-center gap-3 text-center text-sm">
            <p class="text-muted-foreground">{t(exportMessages.failed)}</p>
            <Button variant="outline" size="sm" onclick={() => exported.retry()}>
              {t(exportMessages.retry)}
            </Button>
          </div>
        {:else}
          <div class="flex h-full items-center justify-center">
            <Loader2Icon class="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        {/if}
      </div>
    </TabsContent>
  </Tabs>

  {#if dirty}
    <p class="flex items-center gap-2 text-sm text-muted-foreground">
      <InfoIcon class="size-4 shrink-0" aria-hidden="true" />
      {t(exportMessages.savedVersion)}
    </p>
  {/if}

  <DialogFooter class="gap-2 sm:space-x-0">
    <Button variant="outline" disabled={!exported.file} onclick={() => exported.download()}>
      <DownloadIcon />
      {t(exportMessages.download)}
    </Button>
    <Button disabled={!exported.file} onclick={() => void exported.copy()}>
      <CopyIcon />
      {t(exportMessages.copy)}
    </Button>
  </DialogFooter>
</ScyllaDialog>
