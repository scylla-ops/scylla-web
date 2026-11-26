<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { scyllaNavigate } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { FeatureHeader } from '@scylla/ui';
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
  }

  let { counts, projectIds }: Props = $props();

  const deleteProject = createMutation(() => projectMutations.remove());

  const selection = createFeatureSelection('projects', () => projectIds, {
    deleteItem: id => deleteProject.mutateAsync(id),
  });

  // Creating is an workspace capability; deleting is checked per project.
  const canCreate = $derived(can(Permission.CREATE_PROJECT));
  const canDelete = $derived(can(Permission.DELETE_PROJECT));
</script>

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
  {...selection.headerProps}
  onNew={() => scyllaNavigate.goToWorkspaceRoute('/projects/new')}
  newLabel={t(projectMessages.newProject)}
  canNew={canCreate}
  newDeniedReason={t(projectMessages.createDenied)}
  {canDelete}
  deleteDeniedReason={t(projectMessages.deleteDenied)}
/>
