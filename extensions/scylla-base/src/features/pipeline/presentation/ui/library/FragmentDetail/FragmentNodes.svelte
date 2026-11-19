<script lang="ts">
  import { Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { nodeCommandLine } from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';

  interface Props {
    nodes: PipelineNodeEntity[];
  }

  let { nodes }: Props = $props();
</script>

<!-- The nodes of the latest version, in the order of the fragment. -->
<Card class="flex flex-col gap-4 p-4">
  <h2>{t(libraryMessages.overview)}</h2>
  <ol class="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
    {#each nodes as node (node.id)}
      <li class="flex min-w-0 flex-col gap-2 rounded-lg border bg-background p-3">
        <div>
          <p class="truncate text-sm font-semibold">{node.id}</p>
          <p class="text-xs text-muted-foreground">{node.kind}</p>
        </div>
        <code class="truncate rounded-md bg-muted px-2 py-1 font-mono text-xs">{nodeCommandLine(node)}</code>
      </li>
    {/each}
  </ol>
  <p class="text-xs text-muted-foreground">{t(libraryMessages.nodeCount(nodes.length))}</p>
</Card>
