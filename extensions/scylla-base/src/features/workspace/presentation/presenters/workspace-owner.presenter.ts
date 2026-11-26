import { t } from '@scylla/ui/i18n';
import type {
  WorkspaceEntity,
  WorkspaceOwnerEntity,
} from '@base/features/workspace/domain/entities/workspace.entity.ts';
import { workspaceMessages } from '@base/features/workspace/presentation/messages/workspace.messages.ts';

/** The number of other workspaces that the switcher shows to an instance admin. */
export const OTHERS_LIMIT = 5;

/** The time that the switcher waits after a key before it asks the server. */
export const SEARCH_DELAY_MS = 250;

/** The path of the list of all the workspaces, in the administration. */
export const ADMIN_WORKSPACES_PATH = '/admin/workspaces';

/** The list of all the workspaces, with the text of a search. */
export const allWorkspacesHref = (query: string): string => {
  const text = query.trim();
  return text ? `${ADMIN_WORKSPACES_PATH}?q=${encodeURIComponent(text)}` : ADMIN_WORKSPACES_PATH;
};

/** The name of the owner, else the handle. */
export const ownerName = (owner: WorkspaceOwnerEntity): string =>
  owner.displayName || owner.username;

/** The email when it is known, else the handle: the hint beside the name of the owner. */
export const ownerHint = (owner: WorkspaceOwnerEntity): string =>
  owner.email || (owner.username ? `@${owner.username}` : '');

/** The texts that a search of the workspaces matches: the workspace and its owner. */
export const workspaceSearchFields = (workspace: WorkspaceEntity): string[] =>
  [
    workspace.name,
    workspace.slug,
    workspace.owner?.displayName,
    workspace.owner?.username,
    workspace.owner?.email,
  ].filter((text): text is string => !!text);

const ROLES: Record<string, () => string> = {
  owner: () => t(workspaceMessages.roleOwner),
  admin: () => t(workspaceMessages.roleAdmin),
  member: () => t(workspaceMessages.roleMember),
  viewer: () => t(workspaceMessages.roleViewer),
};

/**
 * The role of the user of the session in a workspace. No role: "Instance admin" for a user that
 * sees each workspace, else nothing. A custom role shows its name.
 */
export const workspaceRoleLabel = (
  role: string | undefined,
  seesAll: boolean,
): string | undefined => {
  if (role === undefined) return undefined;
  if (!role) return seesAll ? t(workspaceMessages.roleInstanceAdmin) : undefined;
  return ROLES[role]?.() ?? role;
};

/** The members and the projects of a workspace, when the list gave them. */
export const workspaceCounts = (
  workspace: Pick<WorkspaceEntity, 'memberCount' | 'projectCount'>,
): string[] => [
  ...(workspace.memberCount !== undefined
    ? [t(workspaceMessages.memberCount(workspace.memberCount))]
    : []),
  ...(workspace.projectCount !== undefined
    ? [t(workspaceMessages.projectCount(workspace.projectCount))]
    : []),
];
