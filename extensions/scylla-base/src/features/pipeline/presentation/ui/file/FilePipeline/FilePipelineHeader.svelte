<script lang="ts">
  import FileCodeIcon from '@lucide/svelte/icons/file-code';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import TagIcon from '@lucide/svelte/icons/tag';
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import { SearchSelect, type SearchSelectOption } from '@scylla/ui';
  import { Badge, Skeleton, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { fileMessages } from '@base/features/pipeline/presentation/messages/file.messages.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import type { RefOption } from '@base/features/pipeline/presentation/presenters/ref-options.presenter.ts';
  import type { FilePipeline } from './file-pipeline.state.svelte.ts';

  interface Props {
    view: FilePipeline;
  }

  let { view }: Props = $props();
</script>

{#snippet refRow(option: SearchSelectOption)}
  {@const Icon = (option as RefOption).kind === 'tag' ? TagIcon : GitBranchIcon}
  <span class="flex min-w-0 items-center gap-2">
    <Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span class="flex min-w-0 flex-col">
      <span class="truncate font-mono text-sm">{option.label}</span>
      {#if option.hint}
        <span class="truncate text-xs text-muted-foreground">{option.hint}</span>
      {/if}
    </span>
  </span>
{/snippet}

<div class="flex w-full items-center justify-between gap-3">
  <div class="flex min-w-0 flex-1 items-center gap-3">
    <!-- The name of the pipeline, as the editor shows it, but read only: it comes from the file. -->
    <div
      class="flex h-8 max-w-full min-w-0 items-center overflow-hidden rounded-md border border-input shadow-xs dark:bg-input/30"
    >
      <span
        class="flex h-full shrink-0 items-center gap-1.5 border-r border-input bg-muted/50 px-2.5 text-xs whitespace-nowrap text-muted-foreground"
      >
        <WorkflowIcon class="size-3.5" aria-hidden="true" />
        {t(pipelineMessages.pipelineName)}
      </span>
      {#if view.missing === 'loading'}
        <Skeleton class="mx-2.5 h-2.5 w-30 rounded-full" />
      {:else}
        <span class="min-w-32 truncate px-2.5 font-mono text-sm">{view.name}</span>
      {/if}
    </div>

    <TabsList class="shrink-0">
      <TabsTrigger value="scripting" disabled={!view.file}>
        {t(pipelineMessages.scripting)}
      </TabsTrigger>
      <TabsTrigger value="blueprint">{t(pipelineMessages.blueprint)}</TabsTrigger>
    </TabsList>
  </div>

  <div class="flex shrink-0 items-center gap-3">
    <Badge variant="outline" class="h-6 px-2.5">
      <FileCodeIcon aria-hidden="true" />
      {t(fileMessages.fromFile)}
    </Badge>
    <SearchSelect
      class="w-48"
      aria-label={t(fileMessages.branch)}
      options={view.options}
      value={view.value}
      onValueChange={value => view.pick(value)}
      loading={view.refsLoading}
      row={refRow}
    />
  </div>
</div>
