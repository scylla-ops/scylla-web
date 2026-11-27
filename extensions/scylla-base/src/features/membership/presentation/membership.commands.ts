import { msg } from '@lingui/core/macro';
import UserPlusIcon from '@lucide/svelte/icons/user-plus';
import { Permission } from '@platform/authz';
import { contextStore } from '@platform/context';
import { routeParams, type CreateCommand } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';

const context = toRune(contextStore);

/** The members page opens its add form with `?add`. */
const addPath = (path: string): string | null => {
  const { workspaceSlug } = routeParams();
  return workspaceSlug ? `/${workspaceSlug}/${path}?add` : null;
};

export const membershipCommands: readonly CreateCommand[] = [
  {
    id: 'membership.add-workspace-members',
    kind: 'create',
    title: msg`Add members`,
    keywords: msg`invite people user team workspace role`,
    icon: UserPlusIcon,
    permission: Permission.MANAGE_WORKSPACE_GRANTS,
    available: () => !!context().workspace.id,
    place: () => context().workspace.name ?? undefined,
    form: { path: () => addPath('access/members') },
  },
  {
    id: 'membership.add-project-members',
    kind: 'create',
    title: msg`Add members to this project`,
    keywords: msg`invite people user team access role`,
    icon: UserPlusIcon,
    permission: Permission.MANAGE_PROJECT_GRANTS,
    available: () => !!routeParams().projectId,
    here: () => !!routeParams().projectId && !routeParams().pipelineId,
    place: () => context().project.name ?? undefined,
    form: {
      path: () => {
        const { projectId } = routeParams();
        return projectId ? addPath(`projects/${projectId}/members`) : null;
      },
    },
  },
];
