<script lang="ts">
  import { ResizableHandle, ResizablePane, ResizablePaneGroup } from '@scylla/ui/primitives';
  import { createCompactContainer } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { isActiveStatus } from '@shared/domain/structs/job-status.struct.ts';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobLogMessages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';
  import type { LogDisplay } from '@base/features/jobs/presentation/ui/jobs-log/log-display-settings.state.svelte.ts';
  import JobLogViewer from '@base/features/jobs/presentation/ui/jobs-log/JobLogViewer/JobLogViewer.svelte';
  import type { JobLogPlaceState } from '../job-log-place.state.svelte.ts';
  import NodePathNote from '../NodePathNote.svelte';
  import { createJobLogWorkspace } from './job-log-workspace.state.svelte.ts';
  import JobNodeList from './JobNodeList.svelte';
  import JobNodeSelect from './JobNodeSelect.svelte';

  /** Under this width, the list of the nodes is a select above the log. */
  const SPLIT_MIN_WIDTH = 768;

  interface Props {
    job: JobEntity;
    place: JobLogPlaceState;
    display: LogDisplay;
  }

  let { job, place, display }: Props = $props();

  const workspace = createJobLogWorkspace(
    () => job,
    () => place.nodeId,
  );
  const layout = createCompactContainer(SPLIT_MIN_WIDTH);
</script>

{#snippet note()}
  {#if workspace.selected}
    <NodePathNote
      node={job.nodes.find(node => node.id === workspace.selected?.id)}
      execution={workspace.selected.execution}
      path={workspace.path}
    />
  {/if}
{/snippet}

{#snippet viewer()}
  <JobLogViewer
    tail={workspace.tail}
    nodeId={place.nodeId}
    title={workspace.title}
    {display}
    isLive={isActiveStatus(job.status)}
    fullscreen={place.fullscreen}
    onFullscreenChange={place.setFullscreen}
    fileName={workspace.fileName}
    {note}
    unavailable={workspace.unavailable}
  />
{/snippet}

{#snippet list(compact: boolean)}
  <JobNodeList
    {job}
    items={workspace.items}
    selectedId={place.nodeId}
    errorCount={workspace.tail.errorCount}
    onSelect={place.select}
    {display}
    {compact}
  />
{/snippet}

<!--
  The nodes beside the log, which takes the rest of the room; only the log scrolls. In full
  screen, the same view covers the app with the nodes as a rail. Paneforge keeps the width of the
  list in `paneforge:scylla.job.log-split` (tracker registry).
-->
<div
  {@attach layout.measure}
  class={cn(
    'flex min-h-0 min-w-0 flex-1 flex-col gap-2',
    place.fullscreen && 'fixed inset-0 z-50 bg-background p-3',
  )}
>
  {#if layout.isCompact}
    <JobNodeSelect
      items={workspace.items}
      selectedId={place.nodeId}
      errorCount={workspace.tail.errorCount}
      onSelect={place.select}
    />
    <div class="min-h-0 flex-1">{@render viewer()}</div>
  {:else}
    <ResizablePaneGroup direction="horizontal" autoSaveId="scylla.job.log-split" class="min-h-0">
      <ResizablePane
        id="job-log-nodes"
        order={1}
        defaultSize={26}
        minSize={14}
        maxSize={50}
        class="min-w-0"
      >
        {@render list(place.fullscreen)}
      </ResizablePane>
      <ResizableHandle aria-label={t(jobLogMessages.resizeList)} class="mx-1.5" />
      <ResizablePane id="job-log-viewer" order={2} minSize={40} class="min-w-0">
        {@render viewer()}
      </ResizablePane>
    </ResizablePaneGroup>
  {/if}
</div>
