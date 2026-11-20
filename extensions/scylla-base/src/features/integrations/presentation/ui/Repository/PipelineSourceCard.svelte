<script lang="ts">
  import { Badge, RadioGroup, RadioGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    PipelineSource,
    RepositoryLink,
  } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
  import { pipelineSourceMessages as messages } from '@base/features/integrations/presentation/messages/pipeline-source.messages.ts';
  import PipelineFileList from './PipelineFileList.svelte';
  import type { RepositoryPage } from './repository-page.state.svelte.ts';

  interface Props {
    page: RepositoryPage;
    link: RepositoryLink;
  }

  let { page, link }: Props = $props();

  const id = $props.id();
  const source = $derived(page.source);
  const readOnly = $derived(!page.canManage || source.pending);

  const SOURCES = [
    { value: 'editor', title: messages.editor, body: messages.editorBody },
    { value: 'file', title: messages.files, body: messages.filesBody },
  ] as const;
</script>

<section class="flex flex-col gap-4 rounded-xl border bg-card p-5" aria-labelledby="{id}-title">
  <div class="flex flex-col gap-1">
    <h2 id="{id}-title" class="text-base">{t(messages.title)}</h2>
    <p class="text-sm text-muted-foreground">{t(messages.description)}</p>
  </div>

  <!-- The value stays the current source: a choice opens the dialog of the move. -->
  <RadioGroup
    class="flex flex-col gap-3"
    aria-labelledby="{id}-title"
    disabled={readOnly}
    bind:value={() => source.current, next => source.ask(next as PipelineSource)}
  >
    {#each SOURCES as item (item.value)}
      {@const checked = source.current === item.value}
      <!-- The list of the files is not in the label: a label holds text only. -->
      <div
        class={cn(
          'flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors',
          checked && 'border-primary',
          readOnly && !checked && 'opacity-60',
        )}
        data-source={item.value}
      >
        <RadioGroupItem
          id="{id}-{item.value}-radio"
          value={item.value}
          aria-labelledby="{id}-{item.value}"
          aria-describedby="{id}-{item.value}-body"
        />
        <div class="flex min-w-0 grow flex-col gap-2">
          <label
            for="{id}-{item.value}-radio"
            class={cn('flex flex-col gap-0.5', readOnly ? 'cursor-not-allowed' : 'cursor-pointer')}
          >
            <span class="flex flex-wrap items-center gap-2">
              <span id="{id}-{item.value}" class="text-sm font-medium">{t(item.title)}</span>
              {#if item.value === 'file'}
                <Badge variant="secondary">{t(messages.formats)}</Badge>
              {/if}
            </span>
            <span id="{id}-{item.value}-body" class="text-xs text-muted-foreground">
              {t(item.body)}
            </span>
          </label>
          {#if item.value === 'file' && checked}
            <PipelineFileList
              files={source.filesQuery.data}
              failed={source.filesQuery.isError}
              branch={link.defaultBranch}
            />
          {/if}
        </div>
      </div>
    {/each}
  </RadioGroup>

  <p class="text-xs text-muted-foreground">{t(messages.manualOnly)}</p>
</section>
