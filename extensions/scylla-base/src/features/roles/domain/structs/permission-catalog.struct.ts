import {
  Permission,
  PERMISSION_IMPLICATIONS,
  PermissionScope,
  permissionLevel,
  scopeCovers,
} from '@platform/authz';

/**
 * The permissions a human may toggle when building a role. Invariant: every permission the UI
 * gates on is in this catalog. Permissions outside it are kept untouched when a role is edited.
 */
export interface PermissionDefinition {
  id: Permission;
  /** The narrowest scope where it does something: its `permissionLevel`. */
  scope: PermissionScope;
  /** Needed for this one to mean anything; also its parent in the editor's tree. */
  dependsOn?: Permission;
}

const { SYSTEM, ORGANIZATION, PROJECT } = PermissionScope;

/** Ordered by scope, then by tree: the order the editor renders. */
const TREE: Omit<PermissionDefinition, 'scope'>[] = [
  { id: Permission.LIST_USERS },
  { id: Permission.CREATE_USER, dependsOn: Permission.LIST_USERS },
  { id: Permission.DELETE_USER, dependsOn: Permission.LIST_USERS },
  { id: Permission.CREATE_ORGANIZATION },
  { id: Permission.MANAGE_ROLES },
  { id: Permission.MANAGE_SYSTEM_GRANTS },
  { id: Permission.READ_ORGANIZATION },
  { id: Permission.UPDATE_ORGANIZATION, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.DELETE_ORGANIZATION, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.LIST_AGENTS, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.CREATE_AGENT, dependsOn: Permission.LIST_AGENTS },
  { id: Permission.READ_APP, dependsOn: Permission.LIST_AGENTS },
  { id: Permission.READ_APP_STATS, dependsOn: Permission.LIST_AGENTS },
  { id: Permission.DELETE_APP, dependsOn: Permission.LIST_AGENTS },
  { id: Permission.LIST_PROJECTS_BY_ORGANIZATION, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.CREATE_PROJECT, dependsOn: Permission.LIST_PROJECTS_BY_ORGANIZATION },
  { id: Permission.LIST_ORGANIZATION_MEMBERS, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.MANAGE_ORG_GRANTS, dependsOn: Permission.LIST_ORGANIZATION_MEMBERS },
  { id: Permission.MANAGE_ORG_ROLES, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.READ_PROJECT },
  { id: Permission.UPDATE_PROJECT, dependsOn: Permission.READ_PROJECT },
  { id: Permission.DELETE_PROJECT, dependsOn: Permission.READ_PROJECT },
  { id: Permission.LIST_PROJECT_MEMBERS, dependsOn: Permission.READ_PROJECT },
  { id: Permission.MANAGE_PROJECT_GRANTS, dependsOn: Permission.LIST_PROJECT_MEMBERS },
  { id: Permission.LIST_PIPELINES_BY_PROJECT, dependsOn: Permission.READ_PROJECT },
  { id: Permission.READ_PIPELINE, dependsOn: Permission.LIST_PIPELINES_BY_PROJECT },
  { id: Permission.CREATE_PIPELINE, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.UPDATE_PIPELINE, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.DELETE_PIPELINE, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.RUN_PIPELINE, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.MANAGE_TRIGGERS, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.LIST_JOBS_BY_PIPELINE, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.READ_JOB_LOGS, dependsOn: Permission.LIST_JOBS_BY_PIPELINE },
  { id: Permission.DELETE_JOB, dependsOn: Permission.LIST_JOBS_BY_PIPELINE },
  { id: Permission.LIST_SECRETS, dependsOn: Permission.READ_PROJECT },
  { id: Permission.CREATE_SECRET, dependsOn: Permission.LIST_SECRETS },
  { id: Permission.DELETE_SECRET, dependsOn: Permission.LIST_SECRETS },
];

export const PERMISSION_CATALOG: PermissionDefinition[] = TREE.map(entry => ({
  ...entry,
  scope: permissionLevel(entry.id),
}));

const DEFINITION_BY_PERMISSION = new Map<Permission, PermissionDefinition>(
  PERMISSION_CATALOG.map(definition => [definition.id, definition]),
);

export const getPermissionDefinition = (permission: Permission): PermissionDefinition | undefined =>
  DEFINITION_BY_PERMISSION.get(permission);

export const isEditablePermission = (permission: Permission): boolean =>
  DEFINITION_BY_PERMISSION.has(permission);

export const ALL_SCOPES: PermissionScope[] = [SYSTEM, ORGANIZATION, PROJECT];

/** A role may confer the permissions of its scope and of every narrower one. */
export const getPermissionDefinitionsForScope = (
  scope: PermissionScope,
): PermissionDefinition[] =>
  PERMISSION_CATALOG.filter(definition => scopeCovers(scope, definition.scope));

/** Conferred by the scope itself, and written on the author's behalf: the editor does not offer it. */
export interface ImplicitPermission {
  id: Permission;
  /** Takes its place (adopts its children, ticking it writes `id` too). Absent: always conferred, shown locked. */
  standsIn?: Permission;
}

/**
 * What each scope confers without asking, because it is what the scope already means:
 * - organization: READ_ORGANIZATION is belonging; READ_PROJECT rides on
 *   LIST_PROJECTS_BY_ORGANIZATION (listing every project without opening any is useless).
 * - system: the `PERMISSION_IMPLICATIONS` of authz (MANAGE_SYSTEM_GRANTS rides on MANAGE_ROLES).
 */
const IMPLICIT_PERMISSIONS_BY_SCOPE: Partial<Record<PermissionScope, ImplicitPermission[]>> = {
  [PermissionScope.SYSTEM]: PERMISSION_IMPLICATIONS.map(({ permission, by }) => ({
    id: permission,
    standsIn: by,
  })),
  [PermissionScope.ORGANIZATION]: [
    { id: Permission.READ_ORGANIZATION },
    { id: Permission.READ_PROJECT, standsIn: Permission.LIST_PROJECTS_BY_ORGANIZATION },
    { id: Permission.READ_PIPELINE, standsIn: Permission.LIST_PIPELINES_BY_PROJECT },
  ],
  [PermissionScope.PROJECT]: [
    { id: Permission.READ_PIPELINE, standsIn: Permission.LIST_PIPELINES_BY_PROJECT },
  ],
};

export const getImplicitAtScope = (scope: PermissionScope): ImplicitPermission[] =>
  IMPLICIT_PERMISSIONS_BY_SCOPE[scope] ?? [];

/** What the scope confers whatever the author chooses. */
export const getAlwaysGrantedPermissionsForScope = (scope: PermissionScope): Permission[] =>
  getImplicitAtScope(scope)
    .filter(entry => entry.standsIn === undefined)
    .map(entry => entry.id);

export const isImplicitAtScope = (permission: Permission, scope: PermissionScope): boolean =>
  getImplicitAtScope(scope).some(entry => entry.id === permission);

/** What gets written: the choices, what the scope confers, and what a ticked stand-in carries. */
export const withImplicitPermissions = (
  scope: PermissionScope,
  selected: Permission[],
): Permission[] => {
  const conferred = new Set(selected);
  for (const entry of getImplicitAtScope(scope)) {
    if (entry.standsIn === undefined || conferred.has(entry.standsIn)) conferred.add(entry.id);
  }
  return [...conferred];
};

/** What ticking `permission` writes at `scope`: itself, and the hidden permissions it stands in for. */
export const carriedBy = (scope: PermissionScope, permission: Permission): Permission[] => [
  permission,
  ...getImplicitAtScope(scope)
    .filter(entry => entry.standsIn === permission)
    .map(entry => entry.id),
];

export const getPermissionsForScope = (scope: PermissionScope): Permission[] =>
  getPermissionDefinitionsForScope(scope).map(definition => definition.id);
