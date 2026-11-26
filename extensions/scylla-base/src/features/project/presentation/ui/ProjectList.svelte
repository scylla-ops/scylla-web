<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { createMutation } from '@scylla/core-sdk';
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import ProjectCard from './ProjectCard/ProjectCard.svelte';
  import ProjectHeader from './ProjectHeader.svelte';
  import ProjectEmpty from './ProjectResults/ProjectEmpty.svelte';
  import ProjectShowMore from './ProjectResults/ProjectShowMore.svelte';
  import ProjectSections from './ProjectSections/ProjectSections.svelte';
  import ProjectReorderBar from './ProjectToolbar/ProjectReorderBar.svelte';
  import ProjectToolbar from './ProjectToolbar/ProjectToolbar.svelte';
  import { setProjectLayout } from './project-layout.context.ts';
  import { createProjectList } from './project-list.state.svelte.ts';
  import { createProjectReorder } from './project-reorder.state.svelte.ts';
  import { createProjectSections } from './project-sections.state.svelte.ts';
  import { projectMessages } from '../messages/project.messages.ts';
  import { projectGroupMutations } from '../project-group.queries.ts';
  import {
    applyMoves,
    movesToSave,
    neighborsOf,
    PINS,
  } from '../presenters/project-sections.presenter.ts';

  interface Props {
    workspaceId: string;
  }

  let { workspaceId }: Props = $props();

  const list = createProjectList(() => workspaceId);
  const reorder = createProjectReorder();
  const sections = createProjectSections({
    workspaceId: () => workspaceId,
    order: () => list.order,
    health: () => list.health,
    phone: () => list.phone,
    moves: () => reorder.moves,
  });
  const move = createMutation(() => projectGroupMutations.move());
  const GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3';

  // The groups and the order of the workspace: the right to edit its projects.
  const canManage = $derived(can(Permission.UPDATE_PROJECT, { workspaceId }));
  let creating = $state(false);

  setProjectLayout({
    get groups() {
      return sections.groups;
    },
    get canArrange() {
      return list.order === 'position' && !list.query && !reorder.active;
    },
    isPinned: sections.isPinned,
    togglePin: sections.togglePin,
    neighbors: (section, projectId) => neighborsOf(sections.idsOf(section), projectId),
    // « Move up » swaps the card with the card before it; « Move down » with the card after it.
    moveUp: (section, project) => {
      const { previous } = neighborsOf(sections.idsOf(section), project.id);
      if (!previous) return;
      if (section === PINS) sections.placePin(project.id, previous);
      else move.mutate([{ id: project.id, groupId: project.groupId, beforeId: previous }]);
    },
    moveDown: (section, project) => {
      const { next } = neighborsOf(sections.idsOf(section), project.id);
      if (!next) return;
      if (section === PINS) sections.placePin(next, project.id);
      else move.mutate([{ id: next, groupId: project.groupId, beforeId: project.id }]);
    },
  });

  /** « Done »: the pins go to the key of the person, the other drops to the server. */
  const saveOrder = async () => {
    const moves = reorder.moves ?? [];
    const pinMoves = moves.filter(drop => drop.to === PINS);
    const pins = applyMoves({ [PINS]: sections.pins }, pinMoves)[PINS];
    if (pinMoves.length > 0) sections.setPins(pins);
    const saves = movesToSave(moves);
    try {
      if (saves.length > 0) await move.mutateAsync(saves);
    } catch {
      // The global toast shows the error, and the page reads the order of the server again.
    }
    reorder.stop();
  };

  // Escape leaves the reorder mode, out of a field, a dialog or a menu.
  const onkeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !reorder.active || reorder.drag || move.isPending) return;
    const target = event.target as Element | null;
    if (target?.closest('input, textarea, [role="dialog"], [role="alertdialog"], [role="menu"]')) {
      return;
    }
    reorder.stop();
  };

  // A phone has no reorder mode.
  $effect(() => {
    if (list.phone && reorder.active) reorder.stop();
  });

  const noCard = $derived(
    !sections.loading &&
      sections.sections.every(section => !section.loading && section.total === 0) &&
      (list.health !== 'all' || sections.groups.length === 0) &&
      !creating &&
      !reorder.active,
  );
</script>

<svelte:window {onkeydown} />

<div data-tour="projects" class="flex min-h-full w-full shrink-0 flex-col gap-4 pb-20">
  <ProjectHeader
    counts={list.wholeCounts}
    projectIds={list.query ? list.items.map(project => project.id) : sections.projectIds}
    phone={list.phone}
    reordering={reorder.active}
    canManageGroups={canManage}
    onNewGroup={() => (creating = true)}
  />
  {#if reorder.active}
    <ProjectReorderBar busy={move.isPending} onCancel={reorder.stop} onDone={saveOrder} />
  {:else}
    <ProjectToolbar
      text={list.text}
      health={list.health}
      order={list.order}
      counts={list.query ? list.counts : list.wholeCounts}
      phone={list.phone}
      onType={list.type}
      onClear={list.clearSearch}
      onHealth={list.setHealth}
      onOrder={list.setOrder}
      canReorder={canManage && !list.phone}
      onReorder={reorder.start}
    />
  {/if}

  {#if list.query}
    {#if list.results.isPending}
      <ListSkeleton rows={list.phone ? 3 : 6} class={GRID} rowClass="h-60 w-full rounded-xl" />
    {:else if !list.results.data}
      <ErrorState message={t(projectMessages.loadError)} />
    {:else if list.items.length === 0}
      <ProjectEmpty query={list.query} health={list.health} onClearSearch={list.clearSearch} />
    {:else}
      <div class="flex flex-wrap items-center gap-x-2" data-part="project-results">
        <p class="text-sm font-medium text-muted-foreground">
          {t(projectMessages.results(list.total, list.query))}
        </p>
        <Button variant="link" class="h-auto p-0" onclick={list.clearSearch}>
          {t(projectMessages.clearSearch)}
        </Button>
      </div>
      <!-- A search shows one list, with no section. -->
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
  {:else if sections.loading}
    <ListSkeleton rows={list.phone ? 3 : 6} class={GRID} rowClass="h-60 w-full rounded-xl" />
  {:else if sections.failed}
    <ErrorState message={t(projectMessages.loadError)} />
  {:else if noCard}
    <ProjectEmpty query="" health={list.health} onClearSearch={list.clearSearch} />
  {:else}
    <ProjectSections
      {workspaceId}
      {sections}
      {reorder}
      phone={list.phone}
      {canManage}
      {creating}
      onCreated={() => (creating = false)}
    />
  {/if}
</div>
