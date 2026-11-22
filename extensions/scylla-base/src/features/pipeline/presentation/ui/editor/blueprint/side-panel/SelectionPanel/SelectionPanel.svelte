<script lang="ts">
  import BookmarkPlusIcon from '@lucide/svelte/icons/bookmark-plus';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { detectParameters } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { nodeIcon } from '@base/features/pipeline/presentation/presenters/node-kind.presenter.ts';
  import ParameterKey from '@base/features/pipeline/presentation/ui/library/ParameterKey.svelte';

  interface Props {
    nodes: PipelineNodeEntity[];
    /** No callback: the selection cannot become a fragment, such as in a new pipeline. */
    onSave?: () => void;
  }

  let { nodes, onSave }: Props = $props();

  const parameters = $derived(detectParameters(nodes));
</script>

<!-- The nodes that a box or Shift selected, and what a fragment of them would ask for. -->
<div class="flex h-full flex-col">
  <div class="border-b px-4 py-3.5">
    <h2 class="text-sm">{t(libraryMessages.selection)}</h2>
    <p class="text-xs text-muted-foreground">{t(libraryMessages.nodeCount(nodes.length))}</p>
  </div>

  <div class="relative min-h-0 flex-1 overflow-y-auto">
    <section class="border-b px-4 py-3">
      <h3 class="pb-2 text-[11px] tracking-wider text-muted-foreground uppercase">
        {t(libraryMessages.selectionNodes)}
      </h3>
      <ul class="flex flex-col gap-1.5">
        {#each nodes as node (node.id)}
          {@const Icon = nodeIcon(node.kind)}
          <li class="flex items-center gap-2 text-[13px]">
            <Icon class="size-3.5 text-muted-foreground" />
            <span class="min-w-0 flex-1 truncate font-medium">{node.id}</span>
            <span class="text-xs text-muted-foreground">
              {node.kind === 'script' ? node.shell : node.kind === 'exec' ? node.command : node.kind}
            </span>
          </li>
        {/each}
      </ul>
    </section>

    <section class="px-4 py-3">
      <h3 class="pb-2 text-[11px] tracking-wider text-muted-foreground uppercase">
        {t(libraryMessages.detectedParameters)}
      </h3>
      {#if parameters.length}
        <ul class="flex flex-col gap-1.5">
          {#each parameters as parameter (parameter.key)}
            <li class="flex items-center gap-2 text-xs">
              <ParameterKey {parameter} />
              <span class="ml-auto truncate font-mono text-muted-foreground">
                {parameter.kind === 'secret' ? t(libraryMessages.secret) : parameter.default}
              </span>
            </li>
          {/each}
        </ul>
        <p class="pt-2.5 text-xs text-muted-foreground">{t(libraryMessages.parametersHint)}</p>
      {:else}
        <p class="text-xs text-muted-foreground">{t(libraryMessages.noParameter)}</p>
      {/if}
    </section>
  </div>

  {#if onSave}
    <div class="p-4">
      <Button class="w-full" onclick={onSave}>
        <BookmarkPlusIcon class="size-4" />
        {t(libraryMessages.saveToLibrary)}
      </Button>
    </div>
  {/if}
</div>
