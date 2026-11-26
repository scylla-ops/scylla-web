<script lang="ts">
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import ProjectCard from './ProjectCard/ProjectCard.svelte';
  import ProjectHeader from './ProjectHeader.svelte';
  import ProjectEmpty from './ProjectResults/ProjectEmpty.svelte';
  import ProjectShowMore from './ProjectResults/ProjectShowMore.svelte';
  import ProjectToolbar from './ProjectToolbar/ProjectToolbar.svelte';
  import { createProjectList } from './project-list.state.svelte.ts';
  import { projectMessages } from '../messages/project.messages.ts';

  interface Props {
    workspaceId: string;
  }

  let { workspaceId }: Props = $props();

  const list = createProjectList(() => workspaceId);
  const GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3';
</script>

<div data-tour="projects" class="flex min-h-full w-full shrink-0 flex-col gap-4 pb-20">
  <ProjectHeader counts={list.wholeCounts} projectIds={list.items.map(project => project.id)} />
  <ProjectToolbar
    text={list.text}
    health={list.health}
    order={list.order}
    counts={list.counts}
    phone={list.phone}
    onType={list.type}
    onClear={list.clearSearch}
    onHealth={list.setHealth}
    onOrder={list.setOrder}
  />

  {#if list.results.isPending}
    <ListSkeleton rows={list.phone ? 3 : 6} class={GRID} rowClass="h-60 w-full rounded-xl" />
  {:else if !list.results.data}
    <ErrorState message={t(projectMessages.loadError)} />
  {:else if list.items.length === 0}
    <ProjectEmpty query={list.query} health={list.health} onClearSearch={list.clearSearch} />
  {:else}
    {#if list.query}
      <div class="flex flex-wrap items-center gap-x-2" data-part="project-results">
        <p class="text-sm font-medium text-muted-foreground">
          {t(projectMessages.results(list.total, list.query))}
        </p>
        <Button variant="link" class="h-auto p-0" onclick={list.clearSearch}>
          {t(projectMessages.clearSearch)}
        </Button>
      </div>
    {/if}
    <!-- Breakpoints are viewport-wide and the sidebar takes ~16rem: a card needs about 300 px. -->
    <div class={GRID}>
      {#each list.items as project (project.id)}
        <ProjectCard {project} batch={list.batchOf(project.id)} />
      {/each}
    </div>
    {#if list.nextBatch > 0}
      <ProjectShowMore
        next={list.nextBatch}
        shown={list.items.length}
        total={list.total}
        busy={list.results.isFetching}
        phone={list.phone}
        onShowMore={list.showMore}
      />
    {/if}
  {/if}
</div>
