<script lang="ts">
  import { ResizablePanel } from '@scylla/ui';
  import type { PipelineScriptingState } from './pipeline-scripting.state.svelte.ts';
  import JobList from './JobList/JobList.svelte';
  import JobPane from './JobPane/JobPane.svelte';
  import JobProperties from './JobProperties/JobProperties.svelte';

  interface Props {
    scripting: PipelineScriptingState;
    projectId?: string;
  }

  let { scripting, projectId }: Props = $props();

  let listWidth = $state(256);
  let propertiesWidth = $state(420);
</script>

<!-- The list of the jobs, one or two panes of open jobs, the properties of the focused job. -->
<div class="flex h-full min-h-0 overflow-hidden rounded-xl border bg-card">
  <ResizablePanel bind:width={listWidth} min={200} max={400} edge="end" class="bg-muted/30">
    <JobList
      steps={scripting.steps}
      activeId={scripting.panes.focusedJob}
      onOpen={id => scripting.panes.open(id)}
      onOpenToSide={id => scripting.panes.openToSide(id)}
      onAdd={() => scripting.add()}
      onRemove={id => scripting.remove(id)}
    />
  </ResizablePanel>

  <div class="flex min-w-0 flex-1 border-l">
    {#each scripting.panes.panes as pane, index (index)}
      <JobPane {scripting} {pane} {index} />
    {/each}
  </div>

  {#if scripting.focusedStep}
    <ResizablePanel bind:width={propertiesWidth} min={320} max={640}>
      <JobProperties {scripting} step={scripting.focusedStep} {projectId} />
    </ResizablePanel>
  {/if}
</div>
