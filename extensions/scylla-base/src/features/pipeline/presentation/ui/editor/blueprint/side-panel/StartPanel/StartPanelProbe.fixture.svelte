<script lang="ts">
  import type { PipelineStartPanelContext } from '@base/features/pipeline/presentation/pipeline.points.ts';

  let { context }: { context: PipelineStartPanelContext } = $props();
</script>

<p>Triggers of {context.pipelineId} in {context.projectId}</p>
