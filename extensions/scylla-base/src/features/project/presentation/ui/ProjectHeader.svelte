<script lang="ts">
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
  import { can, Permission } from '@platform/authz';
  import { scyllaNavigate } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { FeatureHeader } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { createFeatureSelection } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectCounts } from '@base/features/project/domain/structs/project-search.struct.ts';
  import { projectMutations } from '../project.queries.ts';
  import { projectMessages } from '../messages/project.messages.ts';

  interface Props {
    /** The counts of the whole workspace. Not loaded yet: no count. */
    counts?: ProjectCounts;
    /** The projects of the cards on the page: "Select all" selects them. */
    projectIds: string[];
    /** A phone has no « Select all » and no « New group ». */
    phone: boolean;
    /** The reorder mode turns off « Select all » and « New project » in their place. */
    reordering: boolean;
    /** « New group » shows: the person changes the groups. */
    canManageGroups: boolean;
    onNewGroup: () => void;
  }

  let { counts, projectIds, phone, reordering, canManageGroups, onNewGroup }: Props = $props();

  const deleteProject = createMutation(() => projectMutations.remove());

  const selection = createFeatureSelection('projects', () => projectIds, {
    deleteItem: id => deleteProject.mutateAsync(id),
  });

  // Creating is an workspace capability; deleting is checked per project.
  const canCreate = $derived(can(Permission.CREATE_PROJECT));
  const canDelete = $derived(can(Permission.DELETE_PROJECT));
  const headerProps = $derived(
    phone ? { ...selection.headerProps, onSelectAll: undefined } : selection.headerProps,
  );
</script>

{#snippet newGroup()}
  {#if canManageGroups && !phone}
    <Button variant="outline" onclick={onNewGroup} data-part="project-new-group">
      <FolderPlusIcon aria-hidden="true" />
      {t(projectMessages.newGroup)}
    </Button>
  {/if}
{/snippet}

{#snippet countsLine()}
  {#if counts}
    <p class="text-sm text-muted-foreground" data-part="project-counts">
      {t(projectMessages.counts(counts.pipelines, counts.failed, counts.running))}
    </p>
  {/if}
{/snippet}

<FeatureHeader
  count={counts?.total}
  underLabel={countsLine}
  label={t(projectMessages.project)}
  pluralLabel={t(projectMessages.projects)}
  {...headerProps}
  selectDisabled={reordering}
  extraActions={newGroup}
  onNew={() => scyllaNavigate.goToWorkspaceRoute('/projects/new')}
  newLabel={t(projectMessages.newProject)}
  canNew={canCreate && !reordering}
  newDeniedReason={t(canCreate ? projectMessages.reorderLeaveFirst : projectMessages.createDenied)}
  {canDelete}
  deleteDeniedReason={t(projectMessages.deleteDenied)}
/>
