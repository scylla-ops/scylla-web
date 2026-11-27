import FolderIcon from '@lucide/svelte/icons/folder';
import PinIcon from '@lucide/svelte/icons/pin';
import { can, Permission } from '@platform/authz';
import { contextStore, workspaceUrl } from '@platform/context';
import {
  createQuery,
  type SecondSidebarLink,
  type SecondSidebarSection,
  type SecondSidebarStatus,
} from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import {
  canListProjects,
  closedSections,
  newProjectPath,
  PINS,
  projectGroupQueries,
  projectIconProps,
  projectPins,
  projectQueries,
  UNGROUPED,
  type ProjectEntity,
} from '@base/features/project';
import { layoutMessages } from './messages/layout.messages.ts';
import { linkParams } from '../shell-params.ts';

/** The group of "All projects" in `project.module.ts`: its id is the id of the rail item. */
const PROJECTS_ITEM = 'projects';

/** Each project of the workspace: the repository reads each page. */
const ALL_PROJECTS = Number.MAX_SAFE_INTEGER;
/** The projects with a job that runs, and the projects with a job that waits: a page each. */
const RUNNING_PROJECTS = 100;
/** The projects with a last job that failed: a page of the server. */
const FAILED_PROJECTS = 100;

/**
 * The projects of the active workspace, after "All projects", as the projects page shows them:
 * the pins of the person, then each group in its order with its folder, then the projects with no
 * group. With no pin and no group, one list with no section. A section folds as on the page: the
 * two share the closed sections of the person. A project with a job that runs, else with a job
 * that waits, else with a last job that failed, has the shape of that status. It reads only while
 * the projects show: the projects in their order, their groups, the running ones, the pending ones
 * and the failed ones (one read each).
 * A person who can create a project has a "+" on each group and on « No group »: a new project
 * there.
 */
export const projectLinks = (
  shown: () => string | undefined,
): (() => readonly SecondSidebarLink[]) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const open = $derived(shown() === PROJECTS_ITEM);
  const enabled = $derived(open && canListProjects(workspaceId));

  const searchOf = (health: 'all' | 'running' | 'pending' | 'failed', limit: number) =>
    projectQueries.search({ workspaceId, query: '', order: 'position', health, limit });
  // The order of the page changes with a write, which refreshes the projects: no timer.
  const projects = createQuery(() => ({
    ...searchOf('all', ALL_PROJECTS),
    enabled,
    refetchInterval: false as const,
  }));
  const running = createQuery(() => ({ ...searchOf('running', RUNNING_PROJECTS), enabled }));
  const pending = createQuery(() => ({ ...searchOf('pending', RUNNING_PROJECTS), enabled }));
  const failed = createQuery(() => ({ ...searchOf('failed', FAILED_PROJECTS), enabled }));
  const groups = createQuery(() => ({ ...projectGroupQueries.list(workspaceId), enabled }));

  // The projects page writes the same keys: each write reads them again.
  let writes = $state(0);
  $effect(() => projectPins.onChange(() => (writes += 1)));
  $effect(() => closedSections.onChange(() => (writes += 1)));
  const pins = $derived.by(() => {
    void writes;
    return projectPins.read(workspaceId);
  });
  const closed = $derived.by(() => {
    void writes;
    return closedSections.read(workspaceId);
  });

  const toggle = (key: string, folded: boolean) => {
    const others = closedSections.read(workspaceId).filter(other => other !== key);
    closedSections.save(workspaceId, folded ? [...others, key] : others);
  };
  const sectionOf = (
    key: string,
    title: string,
    look: Pick<SecondSidebarSection, 'icon' | 'color' | 'action'> = {},
  ): SecondSidebarSection => ({
    key,
    title,
    ...look,
    folded: closed.includes(key),
    onToggle: folded => toggle(key, folded),
  });

  const links = $derived.by((): SecondSidebarLink[] => {
    const slug = linkParams().workspaceSlug;
    if (!open || !slug) return [];
    const items = projects.data?.items ?? [];
    const runningIds = running.data?.items.map(project => project.id) ?? [];
    const pendingIds = pending.data?.items.map(project => project.id) ?? [];
    const failedIds = failed.data?.items.map(project => project.id) ?? [];
    // A job that runs or waits is the newer news: it hides the failure until it ends.
    const statusOf = (id: string): SecondSidebarStatus | undefined => {
      if (runningIds.includes(id)) return { tone: 'running', label: t(layoutMessages.jobRuns) };
      if (pendingIds.includes(id)) return { tone: 'pending', label: t(layoutMessages.jobWaits) };
      if (failedIds.includes(id)) return { tone: 'failed', label: t(layoutMessages.lastJobFailed) };
      return undefined;
    };
    const canCreate = can(Permission.CREATE_PROJECT, { workspaceId });
    const newProject = (label: string, groupId?: string) =>
      canCreate ? { action: { label, href: workspaceUrl(slug, newProjectPath(groupId)) } } : {};
    const linkOf = (project: ProjectEntity, section?: SecondSidebarSection): SecondSidebarLink => ({
      title: project.name,
      href: workspaceUrl(slug, `projects/${project.id}`),
      icon: FolderIcon,
      entityIcon: projectIconProps(project.icon),
      ...(section && { section }),
      status: statusOf(project.id),
    });

    const pinned = pins.flatMap(id => items.find(project => project.id === id) ?? []);
    const groupList = groups.data ?? [];
    if (pinned.length === 0 && groupList.length === 0) return items.map(project => linkOf(project));

    const pinSection = sectionOf(PINS, t(layoutMessages.pinned), { icon: PinIcon });
    const groupIds = groupList.map(group => group.id);
    const ungrouped = sectionOf(
      UNGROUPED,
      t(layoutMessages.noGroup),
      newProject(t(layoutMessages.newProjectNoGroup)),
    );
    return [
      ...pinned.map(project => linkOf(project, pinSection)),
      ...groupList.flatMap(group => {
        const section = sectionOf(group.id, group.name, {
          color: group.color,
          ...newProject(t(layoutMessages.newProjectIn(group.name)), group.id),
        });
        const inGroup = items.filter(project => project.groupId === group.id);
        if (inGroup.length > 0) return inGroup.map(project => linkOf(project, section));
        // An empty group shows too, with one muted call to action (none without the right).
        return [
          {
            title: t(layoutMessages.newProject),
            href: canCreate ? workspaceUrl(slug, newProjectPath(group.id)) : '',
            section,
            placeholder: true,
          },
        ];
      }),
      ...items
        .filter(project => !project.groupId || !groupIds.includes(project.groupId))
        .map(project => linkOf(project, ungrouped)),
    ];
  });

  return () => links;
};
