<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { createMutation } from '@scylla/core-sdk';
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import ProjectItem from './ProjectCard/ProjectItem.svelte';
  import ProjectHeader from './ProjectHeader.svelte';
  import ProjectEmpty from './ProjectResults/ProjectEmpty.svelte';
  import ProjectShowMore from './ProjectResults/ProjectShowMore.svelte';
  import ProjectSections from './ProjectSections/ProjectSections.svelte';
  import ProjectToolbar from './ProjectToolbar/ProjectToolbar.svelte';
  import { createGroupReorder } from './group-reorder.state.svelte.ts';
  import { setProjectLayout } from './project-layout.context.ts';
  import { createProjectDensity } from './project-density.state.svelte.ts';
  import { createProjectList } from './project-list.state.svelte.ts';
  import { createProjectReorder } from './project-reorder.state.svelte.ts';
  import { createProjectSections } from './project-sections.state.svelte.ts';
  import { focusGroup } from './group-focus.attachments.svelte.ts';
  import { projectMessages } from '../messages/project.messages.ts';
  import { projectGroupMutations } from '../project-group.queries.ts';
  import {
    DENSITY_GRIDS,
    DENSITY_SKELETONS,
  } from '../presenters/project-density.presenter.ts';
  import {
    applyMoves,
    groupMovesToSave,
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
  const groups = createGroupReorder();
  const densities = createProjectDensity(() => workspaceId);
  const sections = createProjectSections({
    workspaceId: () => workspaceId,
    order: () => list.order,
    health: () => list.health,
    phone: () => list.phone,
    moves: () => reorder.moves,
    groupOrder: () => groups.order,
    density: key => densities.of(key),
  });
  const move = createMutation(() => projectGroupMutations.move());
  const arrange = createMutation(() => projectGroupMutations.arrange());
  const saving = $derived(move.isPending || arrange.isPending);
  // A search shows one list, in the density of the page.
  const grid = $derived(DENSITY_GRIDS[densities.default]);
  const skeleton = $derived(DENSITY_SKELETONS[densities.default]);

  // The groups and the order of the workspace: the right to edit its projects.
  const canManage = $derived(can(Permission.UPDATE_PROJECT, { workspaceId }));
  // Each section offers a new project in it: the right to create a project in the workspace.
  const canCreate = $derived(can(Permission.CREATE_PROJECT, { workspaceId }));
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

  /** The reorder mode moves the cards and the groups. */
  const startReorder = () => {
    reorder.start();
    groups.start(sections.savedGroupIds);
  };
  const stopReorder = () => {
    reorder.stop();
    groups.stop();
  };

  /**
   * « Done »: the pins go to the key of the person, the order of the groups and the drops to the
   * server.
   */
  const saveOrder = async () => {
    const moves = reorder.moves ?? [];
    const pinMoves = moves.filter(drop => drop.to === PINS);
    const pins = applyMoves({ [PINS]: sections.pins }, pinMoves)[PINS];
    if (pinMoves.length > 0) sections.setPins(pins);
    const groupMoves = groupMovesToSave(
      sections.savedGroupIds,
      sections.groups.map(group => group.id),
    );
    const saves = movesToSave(moves);
    try {
      if (groupMoves.length > 0) await arrange.mutateAsync(groupMoves);
      if (saves.length > 0) await move.mutateAsync(saves);
    } catch {
      // The global toast shows the error, and the page reads the order of the server again.
    }
    stopReorder();
  };

  // Escape leaves the reorder mode, out of a field, a dialog or a menu. During a drag, Escape
  // cancels the drag only.
  const onkeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !reorder.active) return;
    if (reorder.drag || groups.drag || saving) return;
    const target = event.target as Element | null;
    if (target?.closest('input, textarea, [role="dialog"], [role="alertdialog"], [role="menu"]')) {
      return;
    }
    stopReorder();
  };

  // A phone has no reorder mode.
  $effect(() => {
    if (list.phone && reorder.active) stopReorder();
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

<div
  data-tour="projects"
  class="flex min-h-full w-full shrink-0 flex-col gap-4 pb-20"
  {@attach focusGroup(() => ({
    ready: !list.query && !sections.loading && !sections.failed,
    keys: sections.sections.map(section => section.key),
    open: sections.open,
  }))}
>
  <ProjectHeader
    counts={list.wholeCounts}
    projectIds={list.query ? list.items.map(project => project.id) : sections.projectIds}
    phone={list.phone}
    reordering={reorder.active}
    canManageGroups={canManage}
    onNewGroup={() => (creating = true)}
  />
  <!-- The reorder mode changes the controls of the toolbar in their place: nothing moves. -->
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
    onReorder={startReorder}
    reordering={reorder.active}
    busy={saving}
    onCancel={stopReorder}
    onDone={saveOrder}
    density={densities.default}
    mixedDensity={densities.mixed}
    onDensity={densities.setDefault}
    onApplyDensity={densities.applyToAll}
  />

  {#if list.query}
    {#if list.results.isPending}
      <ListSkeleton rows={list.phone ? 3 : 6} class={grid} rowClass={skeleton} />
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
      <div class={grid} data-density={densities.default}>
        {#each list.items as project (project.id)}
          <ProjectItem
            {project}
            batch={list.batchOf(project.id)}
            density={densities.default}
            phone={list.phone}
          />
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
    <ListSkeleton rows={list.phone ? 3 : 6} class={grid} rowClass={skeleton} />
  {:else if sections.failed}
    <ErrorState message={t(projectMessages.loadError)} />
  {:else if noCard}
    <ProjectEmpty query="" health={list.health} onClearSearch={list.clearSearch} />
  {:else}
    <ProjectSections
      {workspaceId}
      {sections}
      {reorder}
      {groups}
      {densities}
      phone={list.phone}
      {canManage}
      {canCreate}
      {creating}
      onNewGroup={() => (creating = true)}
      onCreated={() => (creating = false)}
    />
  {/if}
</div>
