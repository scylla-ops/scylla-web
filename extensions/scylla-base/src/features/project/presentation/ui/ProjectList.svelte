<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { ErrorState, Pagination, ListSkeleton } from '@scylla/ui';
  import { createPagination } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import { projectQueries } from '../project.queries.ts';
  import ProjectCard from './ProjectCard/ProjectCard.svelte';
  import ProjectHeader from './ProjectHeader.svelte';
  import { projectMessages } from '../messages/project.messages.ts';

  interface Props {
    workspaceId: string;
  }

  let { workspaceId }: Props = $props();

  const pagination = createPagination();

  const projectsQuery = createQuery(() =>
    projectQueries.byWorkspace(workspaceId, pagination.paginationParams),
  );

  const projects = $derived(projectsQuery.data?.items);
  const paginationInfo = $derived(projectsQuery.data?.pagination);
</script>

{#if projectsQuery.isLoading}
  <!-- The header and the grid of the project cards. -->
  <ListSkeleton
    header
    rows={4}
    class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
    rowClass="h-36 w-full rounded-xl"
  />
{:else if projectsQuery.isError || !projects}
  <ErrorState message={t(projectMessages.loadError)} />
{:else}
  <div data-tour="projects" class="flex min-h-full w-full shrink-0 flex-col gap-4 pb-20">
    <ProjectHeader
      numberOfProjects={paginationInfo?.totalCount ?? projects.length}
      projectIds={projects.map(project => project.id)}
    />
    <!-- Breakpoints are viewport-wide and the sidebar takes ~16rem: late 3rd and 4th columns. -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {#each projects as project (project.id)}
        <ProjectCard {project} />
      {/each}
    </div>
    {#if paginationInfo && paginationInfo.totalPages > 1}
      <Pagination {paginationInfo} onPageChange={page => pagination.setPage(page)} />
    {/if}
  </div>
{/if}
