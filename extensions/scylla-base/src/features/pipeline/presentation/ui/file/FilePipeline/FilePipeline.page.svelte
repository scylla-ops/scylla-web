<script lang="ts">
  import { Card, Tabs, TabsContent } from '@scylla/ui/primitives';
  import { createCanvasCurtain } from '@base/features/pipeline/presentation/ui/editor/blueprint/canvas/CanvasCurtain/canvas-curtain.state.svelte.ts';
  import CanvasCurtain from '@base/features/pipeline/presentation/ui/editor/blueprint/canvas/CanvasCurtain/CanvasCurtain.svelte';
  import PipelineBlueprint from '@base/features/pipeline/presentation/ui/editor/blueprint/PipelineBlueprint.svelte';
  import { createFilePipeline } from './file-pipeline.state.svelte.ts';
  import FileNotice from './FileNotice.svelte';
  import FilePanel from './FilePanel.svelte';
  import FilePipelineHeader from './FilePipelineHeader.svelte';
  import FileTextView from './FileTextView.svelte';

  interface Props {
    projectId?: string;
    pipelineId?: string;
  }

  let { projectId, pipelineId }: Props = $props();

  const view = createFilePipeline({
    pipelineId: () => pipelineId ?? '',
    projectId: () => projectId ?? '',
  });

  let canvasReady = $state(false);
  const curtain = createCanvasCurtain({
    ready: () => !view.missing && canvasReady,
    failed: () => view.missing === 'failed',
  });
</script>

<!-- The page of the editor, read only: the graph and the text come from the file of the repository. -->
<Tabs value="blueprint" class="flex h-full flex-col gap-4">
  <FilePipelineHeader {view} />

  <TabsContent value="scripting" class="min-h-0 flex-1 overflow-hidden">
    {#if view.file}
      <FileTextView file={view.file} />
    {/if}
  </TabsContent>

  <TabsContent value="blueprint" class="min-h-0 flex-1">
    <Card
      class="relative h-full overflow-hidden bg-card p-0"
      aria-busy={!curtain.revealed && !curtain.failed}
    >
      {#if !view.missing}
        <div class="h-full" inert={!curtain.revealed}>
          <PipelineBlueprint
            nodes={view.nodes}
            pipelineName={view.name}
            {projectId}
            onNodesChange={() => {}}
            savedLayout={view.savedLayout}
            locked
            dimmed={view.stale}
            onReady={() => (canvasReady = true)}
          >
            {#snippet notice()}
              <FileNotice {view} />
            {/snippet}
            {#snippet sidePanel()}
              <FilePanel {view} />
            {/snippet}
          </PipelineBlueprint>
        </div>
      {/if}
      <CanvasCurtain {curtain} onRetry={() => view.retry()} />
    </Card>
  </TabsContent>
</Tabs>
