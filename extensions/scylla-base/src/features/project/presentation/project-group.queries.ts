import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import type {
  MoveProjectInput,
  ProjectGroupChange,
} from '../domain/entities/project-group.entity.ts';
import type { ProjectEntity } from '../domain/entities/project.entity.ts';
import type { ProjectModule } from '../project.module.ts';
import { projectMessages } from './messages/project.messages.ts';
import { PROJECTS_QUERY_ROOT } from './project.queries.ts';
import { keepRecentColor } from './recent-colors.user-state.ts';

// Resolved per call: tests swap the registry.
const domain = () => getModuleDomain<typeof ProjectModule.domain>('project');
const groups = () => domain().projectGroupRepository;

/** Under the projects: a write of the groups refreshes the searches, which show the sections. */
export const PROJECT_GROUPS_QUERY_KEY = (workspaceId: string) =>
  [...PROJECTS_QUERY_ROOT, workspaceId, 'groups'] as const;

export const projectGroupQueries = {
  /** The groups of a workspace, in their order. The page gates the workspace. */
  list: (workspaceId: string) =>
    queryOptions({
      queryKey: PROJECT_GROUPS_QUERY_KEY(workspaceId),
      queryFn: () => groups().list(workspaceId),
      enabled: !!workspaceId,
      staleTime: 30_000,
    }),
};

/** A group or the order changes the sections and the order of the cards. */
const refresh = () => getQueryClient().invalidateQueries({ queryKey: PROJECTS_QUERY_ROOT });

/** One move at a time: each move reads the order that the move before it made. */
const moveEach = async (moves: readonly MoveProjectInput[]) => {
  for (const move of moves) await groups().move(move);
};

export const projectGroupMutations = {
  create: () =>
    mutationOptions({
      mutationFn: ({ workspaceId, name, color }: { workspaceId: string; name: string; color?: string }) =>
        groups().create(workspaceId, name.trim(), color),
      onSuccess: (_group, { color }) => {
        if (color) keepRecentColor(color);
        return refresh();
      },
    }),

  /** Creates a group after the others, and moves a project into it. */
  createWith: () =>
    mutationOptions({
      mutationFn: async ({
        project,
        name,
        color,
      }: {
        project: ProjectEntity;
        name: string;
        color?: string;
      }) => {
        const group = await groups().create(project.workspaceId, name.trim(), color);
        await groups().move({ id: project.id, groupId: group.id });
        return group;
      },
      onSuccess: (group, { color }) => {
        toast.success(i18n._(projectMessages.movedTo(group.name)));
        if (color) keepRecentColor(color);
        return refresh();
      },
    }),

  /** The name and the color of a group, in one write. An empty color: the default folder. */
  update: () =>
    mutationOptions({
      mutationFn: ({ groupId, name, color }: { groupId: string } & ProjectGroupChange) =>
        groups().update(groupId, { name: name?.trim(), color }),
      onSuccess: (_group, { color }) => {
        if (color) keepRecentColor(color);
        return refresh();
      },
    }),

  /** `position`: the new place in the order of the groups, from 0. */
  reorder: () =>
    mutationOptions({
      mutationFn: ({ groupId, position }: { groupId: string; position: number }) =>
        groups().reorder(groupId, position),
      onSuccess: () => refresh(),
    }),

  remove: () =>
    mutationOptions({
      mutationFn: (groupId: string) => groups().delete(groupId),
      onSuccess: () => {
        toast.success(i18n._(projectMessages.groupDeleted));
        return refresh();
      },
    }),

  /** The moves of « Move to group », « Move up », « Move down » and of the reorder mode. */
  move: () =>
    mutationOptions({
      mutationFn: (moves: readonly MoveProjectInput[]) => moveEach(moves),
      onSettled: () => refresh(),
    }),

  /**
   * A copy of a project just after it, in its group: the name, the description and a glyph icon.
   * An image icon, the pipelines, the secrets and the members are not copied.
   */
  duplicate: () =>
    mutationOptions({
      mutationFn: async ({ project, beforeId }: { project: ProjectEntity; beforeId?: string }) => {
        const projects = domain().projectRepository;
        const name = i18n._(projectMessages.copyName(project.name));
        const copy = await projects.create(
          name,
          project.workspaceId,
          project.description || undefined,
        );
        const { icon } = project;
        if (icon?.kind === 'glyph') {
          await projects.setIcon(copy.id, {
            kind: 'glyph',
            name: icon.name,
            color: icon.color ?? 'primary',
          });
        }
        await groups().move({ id: copy.id, groupId: project.groupId, beforeId });
        return copy;
      },
      onSuccess: () => {
        toast.success(i18n._(projectMessages.duplicated));
        return refresh();
      },
    }),
};
