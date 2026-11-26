<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { ProviderMark } from '@shared/presentation/ui';
  import type { ProjectCardContext } from '@base/features/project';
  import { repositoryLinkQueries } from '../../repository-link.queries.ts';

  interface Props {
    context: ProjectCardContext;
  }

  let { context }: Props = $props();

  // One call for each workspace: each card of the page reads the same list.
  const links = createQuery(() => repositoryLinkQueries.byWorkspace(context.workspaceId));
  const link = $derived(links.data?.find(item => item.projectId === context.projectId));
</script>

<!-- Under the name of the project: its linked repository, if it has one. -->
{#if link}
  <p
    class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
    title={link.fullName}
    data-part="project-repository"
  >
    <ProviderMark kind={link.provider} class="size-3 shrink-0" />
    <span class="truncate">{link.fullName}</span>
  </p>
{/if}
