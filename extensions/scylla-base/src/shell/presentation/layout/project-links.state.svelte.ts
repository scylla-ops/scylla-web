import FolderIcon from '@lucide/svelte/icons/folder';
import { contextStore, workspaceUrl } from '@platform/context';
import { createQuery, type SecondSidebarLink } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { canListProjects, projectQueries } from '@base/features/project';
import { linkParams } from '../shell-params.ts';

/** The group of "All projects" in `project.module.ts`: its id is the id of the rail item. */
const PROJECTS_ITEM = 'projects';

/** The projects of the active workspace, after "All projects". It reads only while they show. */
export const projectLinks = (
  shown: () => string | undefined,
): (() => readonly SecondSidebarLink[]) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const open = $derived(shown() === PROJECTS_ITEM);

  const projects = createQuery(() => ({
    ...projectQueries.lookup(workspaceId),
    enabled: open && canListProjects(workspaceId),
  }));

  const links = $derived.by(() => {
    const slug = linkParams().workspaceSlug;
    if (!open || !slug) return [];
    return (projects.data?.items ?? []).map(project => ({
      title: project.name,
      href: workspaceUrl(slug, `projects/${project.id}`),
      icon: FolderIcon,
    }));
  });

  return () => links;
};
