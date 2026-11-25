<script lang="ts">
  import { ResizablePane } from '@scylla/ui/primitives';
  import { nodeOf } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import type { Blueprint } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.state.svelte.ts';
  import type { FilePipeline } from './file-pipeline.state.svelte.ts';
  import FileNodePanel from './FileNodePanel.svelte';
  import FileSettings from './FileSettings.svelte';

  interface Props {
    view: FilePipeline;
    blueprint: Blueprint;
  }

  let { view, blueprint }: Props = $props();

  type Mode = 'pipeline' | 'node';

  // In percent of the blueprint, as the palette and the inspector of the editor: a node holds code.
  const SIZES = {
    pipeline: { default: 24, min: 18, max: 40 },
    node: { default: 34, min: 24, max: 60 },
  } as const satisfies Record<Mode, { default: number; min: number; max: number }>;

  const node = $derived(blueprint.inspected ? nodeOf(blueprint.inspected) : undefined);
  // The start node is the pipeline: a click on it shows the settings of the file.
  const mode = $derived<Mode>(node ? 'node' : 'pipeline');
  const sizes = $derived(SIZES[mode]);
  const close = () => blueprint.inspect(null);
</script>

<!-- The side panel of a file pipeline, read only: the settings of the file, or the node a click opened. -->
{#key mode}
  <ResizablePane
    id="blueprint-file-{mode}"
    order={2}
    defaultSize={sizes.default}
    minSize={sizes.min}
    maxSize={sizes.max}
  >
    <aside class="flex h-full flex-col bg-card">
      {#if node}
        {#key node.id}
          <FileNodePanel {node} onBack={close} />
        {/key}
      {:else}
        <FileSettings {view} onOpen={id => blueprint.inspect(id)} />
      {/if}
    </aside>
  </ResizablePane>
{/key}
