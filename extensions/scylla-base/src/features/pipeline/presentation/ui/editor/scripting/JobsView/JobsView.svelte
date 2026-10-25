<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { ResizableHandle, ResizablePane, ResizablePaneGroup } from '@scylla/ui/primitives';
  import type { PipelineScriptingState } from '../pipeline-scripting.state.svelte.ts';
  import { scriptingMessages } from '../scripting.messages.ts';
  import JobList from '../JobList/JobList.svelte';
  import JobPane from '../JobPane/JobPane.svelte';
  import JobProperties from '../JobProperties/JobProperties.svelte';
  import PanelToggle from './PanelToggle.svelte';
  import { JOBS_VIEW_SIZES, createJobsViewState } from './jobs-view.state.svelte.ts';

  interface Props {
    scripting: PipelineScriptingState;
    projectId?: string;
  }

  let { scripting, projectId }: Props = $props();

  const view = createJobsViewState({ hasProperties: () => !!scripting.focusedStep });
</script>

{#snippet listToggle()}
  <PanelToggle panel={view.list} label={t(scriptingMessages.toggleJobList)} side="left" />
{/snippet}

{#snippet propertiesToggle()}
  <PanelToggle
    panel={view.properties}
    label={t(scriptingMessages.toggleJobProperties)}
    side="right"
  />
{/snippet}

<!--
  Three panes that never come and go (the list, the jobs, the properties): paneforge builds the
  layout again when their number changes. The toggles of the side panels sit in the tab bars of the
  first and of the last job pane. The handles draw the borders between the panes. The sizes are not
  saved: they last for the visit.
-->
<div
  class="flex h-full min-h-0 overflow-hidden rounded-xl border bg-card"
  {@attach view.list.measure}
  {@attach view.properties.measure}
>
  <ResizablePaneGroup
    direction="horizontal"
    class={cn('min-w-0 flex-1', !view.animated && '[&>[data-pane]]:transition-none')}
  >
    <ResizablePane
      id="jobs-view-list"
      order={1}
      collapsible
      collapsedSize={0}
      defaultSize={view.list.defaultSize}
      minSize={JOBS_VIEW_SIZES.list.min}
      maxSize={JOBS_VIEW_SIZES.list.max}
      onCollapse={view.list.onCollapse}
      onExpand={view.list.onExpand}
      bind:this={view.list.pane}
      class="bg-muted/30"
    >
      {#if view.list.open}
        <JobList
          steps={scripting.steps}
          activeId={scripting.panes.focusedJob}
          onOpen={id => scripting.panes.open(id)}
          onOpenToSide={id => scripting.panes.openToSide(id)}
          onAdd={() => scripting.add()}
          onRemove={id => scripting.remove(id)}
          onMove={(id, target, keep) => scripting.moveJob(id, target, keep)}
        />
      {/if}
    </ResizablePane>

    <ResizableHandle />
    <ResizablePane id="jobs-view-middle" order={2} minSize={JOBS_VIEW_SIZES.middle.min}>
      <!-- The open jobs have a group of their own: a second job changes its number of panes, and
           the layout of the list and of the properties must not be built again. -->
      <ResizablePaneGroup direction="horizontal">
        {#each scripting.panes.panes as pane, index (index)}
          {#if index > 0}
            <ResizableHandle />
          {/if}
          <ResizablePane id="jobs-view-pane-{index}" order={1 + index} minSize={JOBS_VIEW_SIZES.pane.min}>
            <JobPane
              {scripting}
              {pane}
              {index}
              leading={index === 0 ? listToggle : undefined}
              trailing={index === scripting.panes.panes.length - 1 && scripting.focusedStep
                ? propertiesToggle
                : undefined}
            />
          </ResizablePane>
        {/each}
      </ResizablePaneGroup>
    </ResizablePane>

    <!-- Always there: its handle is the only part that goes when no job is focused. -->
    <ResizableHandle disabled={!scripting.focusedStep} class={scripting.focusedStep ? undefined : 'hidden'} />
    <ResizablePane
      id="jobs-view-properties"
      order={3}
      collapsible
      collapsedSize={0}
      defaultSize={view.properties.defaultSize}
      minSize={JOBS_VIEW_SIZES.properties.min}
      maxSize={JOBS_VIEW_SIZES.properties.max}
      onCollapse={view.properties.onCollapse}
      onExpand={view.properties.onExpand}
      bind:this={view.properties.pane}
      class="bg-card"
    >
      {#if scripting.focusedStep && view.properties.open}
        <JobProperties {scripting} step={scripting.focusedStep} {projectId} />
      {/if}
    </ResizablePane>
  </ResizablePaneGroup>
</div>
