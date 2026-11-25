<script lang="ts">
  import { ResizablePane } from '@scylla/ui/primitives';
  import { nodeOf } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import type { Blueprint } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.state.svelte.ts';
  import StartPanel from '@base/features/pipeline/presentation/ui/editor/blueprint/side-panel/StartPanel/StartPanel.svelte';
  import type { FilePipeline } from './file-pipeline.state.svelte.ts';
  import FileNodePanel from './FileNodePanel.svelte';
  import FileSettings from './FileSettings.svelte';

  interface Props {
    view: FilePipeline;
    blueprint: Blueprint;
    pipelineId: string;
    projectId: string;
  }

  let { view, blueprint, pipelineId, projectId }: Props = $props();

  type Mode = 'pipeline' | 'node' | 'triggers';

  // In percent of the blueprint, as the palette and the inspector of the editor: a node holds code.
  const SIZES = {
    pipeline: { default: 24, min: 18, max: 40 },
    node: { default: 34, min: 24, max: 60 },
    triggers: { default: 28, min: 20, max: 46 },
  } as const satisfies Record<Mode, { default: number; min: number; max: number }>;

  const node = $derived(blueprint.inspected ? nodeOf(blueprint.inspected) : undefined);
  // The start node is the pipeline: a click on it shows what starts it. Nothing open: the file.
  const mode = $derived<Mode>(node ? 'node' : blueprint.inspectedStart ? 'triggers' : 'pipeline');
  const sizes = $derived(SIZES[mode]);
  const close = () => blueprint.inspect(null);
</script>

<!--
  The side panel of a file pipeline, read only: the settings of the file, the node a click opened,
  or the triggers of the start node.
-->
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
      {:else if mode === 'triggers'}
        <StartPanel {pipelineId} {projectId} onClose={close} />
      {:else}
        <FileSettings {view} onOpen={id => blueprint.inspect(id)} />
      {/if}
    </aside>
  </ResizablePane>
{/key}
