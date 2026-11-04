import { Permission, PermissionScope } from '@platform/authz';
import type { ObjectKind } from './object-ref.struct.ts';

/**
 * The permission names of the server for each `Permission` of the UI, on each kind of object.
 * `CheckPermissions` answers them for one object in one call. A name that the definition of the
 * kind does not have is refused by the server: each list is exact.
 */
type Names = Partial<Record<ObjectKind, string>>;

const MAP: Partial<Record<Permission, Names>> = {
  // The instance: its admins manage the users.
  [Permission.LIST_USERS]: { platform: 'list_users' },
  [Permission.READ_USER]: { platform: 'get_user' },
  [Permission.CREATE_USER]: { platform: 'create_user' },
  [Permission.UPDATE_USER]: { platform: 'update_user' },
  [Permission.DELETE_USER]: { platform: 'delete_user' },
  [Permission.MANAGE_SYSTEM_GRANTS]: { platform: 'grant_instance_admin' },
  [Permission.CREATE_ORGANIZATION]: { platform: 'create_workspace' },
  [Permission.LIST_ORGANIZATIONS]: { platform: 'list_workspaces' },
  // A workspace.
  [Permission.READ_ORGANIZATION]: { workspace: 'get_workspace' },
  [Permission.UPDATE_ORGANIZATION]: { workspace: 'update_workspace' },
  [Permission.DELETE_ORGANIZATION]: { workspace: 'delete_workspace' },
  [Permission.LIST_ORGANIZATION_MEMBERS]: { workspace: 'list_access' },
  [Permission.ADD_ORGANIZATION_MEMBER]: { workspace: 'grant' },
  [Permission.REMOVE_ORGANIZATION_MEMBER]: { workspace: 'revoke' },
  [Permission.MANAGE_ORG_GRANTS]: { workspace: 'grant' },
  [Permission.CREATE_PROJECT]: { workspace: 'create_project' },
  [Permission.LIST_PROJECTS_BY_ORGANIZATION]: { workspace: 'list_projects' },
  // A project, or each project of a workspace.
  [Permission.READ_PROJECT]: { workspace: 'get_project', project: 'get_project' },
  [Permission.UPDATE_PROJECT]: { workspace: 'update_project', project: 'update_project' },
  [Permission.DELETE_PROJECT]: { workspace: 'delete_project', project: 'delete_project' },
  [Permission.LIST_PROJECT_MEMBERS]: { project: 'list_access' },
  [Permission.ADD_PROJECT_MEMBER]: { project: 'grant' },
  [Permission.REMOVE_PROJECT_MEMBER]: { project: 'revoke' },
  [Permission.MANAGE_PROJECT_GRANTS]: { project: 'grant' },
};

/** The scope of the UI for each kind of object. */
export const SCOPE_OF: Record<ObjectKind, PermissionScope> = {
  platform: PermissionScope.SYSTEM,
  workspace: PermissionScope.ORGANIZATION,
  project: PermissionScope.PROJECT,
};

/** The names to ask on an object of `kind`, each one once. */
export const namesFor = (kind: ObjectKind): string[] => [
  ...new Set(Object.values(MAP).flatMap(names => (names[kind] ? [names[kind]] : []))),
];

/** The `Permission`s that the allowed names give on an object of `kind`. */
export const permissionsFrom = (kind: ObjectKind, allowed: ReadonlySet<string>): Permission[] =>
  Object.entries(MAP).flatMap(([permission, names]) => {
    const name = names[kind];
    return name && allowed.has(name) ? [Number(permission)] : [];
  });
