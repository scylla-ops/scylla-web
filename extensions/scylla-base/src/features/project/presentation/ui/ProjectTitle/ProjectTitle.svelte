<script lang="ts">
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import { can, Permission } from '@platform/authz';
  import { createQuery } from '@scylla/core-sdk';
  import { Skeleton, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { projectMessages } from '../../messages/project.messages.ts';
  import { projectQueries } from '../../project.queries.ts';
  import ProjectIcon from '../ProjectIcon/ProjectIcon.svelte';
  import ProjectIconDialog from '../ProjectIconDialog/ProjectIconDialog.svelte';

  interface Props {
    projectId: string;
    /** The repository that the project is linked to, e.g. `acme/api`. */
    repository?: string;
  }

  let { projectId, repository }: Props = $props();

  const project = createQuery(() => projectQueries.byId(projectId));
  const canChange = $derived(can(Permission.UPDATE_PROJECT, { projectId }));
  let dialogOpen = $state(false);
</script>

<!-- The top of the page of a project: its icon and its name. A click on the icon changes it. -->
<div data-slot="project-title" class="flex min-w-0 items-center gap-4">
  {#if project.data}
    {@const current = project.data}
    {#if canChange}
      <Tooltip>
        <TooltipTrigger
          aria-label={t(projectMessages.changeIcon)}
          class="focus-visible:ring-ring/50 flex shrink-0 cursor-pointer items-center justify-center rounded-xl transition-opacity outline-none hover:opacity-80 focus-visible:ring-[3px]"
          onclick={() => (dialogOpen = true)}
        >
          <ProjectIcon icon={current.icon} size={48} />
        </TooltipTrigger>
        <TooltipContent side="top">{t(projectMessages.changeIcon)}</TooltipContent>
      </Tooltip>
      <ProjectIconDialog
        open={dialogOpen}
        onOpenChange={open => (dialogOpen = open)}
        project={current}
        subtitle={repository}
      />
    {:else}
      <ProjectIcon icon={current.icon} size={48} />
    {/if}
    <!-- Not a heading: the header of the pipelines below holds the heading of the page. -->
    <div class="flex min-w-0 flex-col justify-center gap-1">
      <p class="truncate text-xl font-medium" title={current.name}>{current.name}</p>
      {#if repository}
        <p class="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <GitBranchIcon class="size-3.5 shrink-0" aria-hidden="true" />
          <span class="truncate">{repository}</span>
        </p>
      {/if}
    </div>
  {:else if project.isPending}
    <Skeleton class="size-12 shrink-0 rounded-xl" />
    <Skeleton class="h-6 w-40" />
  {/if}
</div>
