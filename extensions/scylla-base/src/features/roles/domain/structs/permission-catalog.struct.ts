import {
  Permission,
  PermissionScope,
  holdsPermission,
  type EffectivePermissionsEntity,
} from '@platform/authz';

/**
 * The permissions a human may toggle when building a role. Invariant: every permission the UI
 * gates on is in this catalog. Permissions outside it are kept untouched when a role is edited.
 */
export interface PermissionDefinition {
  id: Permission;
  /** The narrowest scope where it does something (backend `AuthzAction.min_scope`). */
  scope: PermissionScope;
  /** Needed for this one to mean anything; also its parent in the editor's tree. */
  dependsOn?: Permission;
}

const { SYSTEM, ORGANIZATION, PROJECT } = PermissionScope;

/** Ordered by scope, then by tree: the order the editor renders. */
export const PERMISSION_CATALOG: PermissionDefinition[] = [
  { id: Permission.LIST_USERS, scope: SYSTEM },
  { id: Permission.CREATE_USER, scope: SYSTEM, dependsOn: Permission.LIST_USERS },
  { id: Permission.DELETE_USER, scope: SYSTEM, dependsOn: Permission.LIST_USERS },
  { id: Permission.CREATE_ORGANIZATION, scope: SYSTEM },
  { id: Permission.MANAGE_ROLES, scope: SYSTEM },
  { id: Permission.MANAGE_SYSTEM_GRANTS, scope: SYSTEM },
  { id: Permission.READ_ORGANIZATION, scope: ORGANIZATION },
  { id: Permission.UPDATE_ORGANIZATION, scope: ORGANIZATION, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.DELETE_ORGANIZATION, scope: ORGANIZATION, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.LIST_AGENTS, scope: ORGANIZATION, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.CREATE_AGENT, scope: ORGANIZATION, dependsOn: Permission.LIST_AGENTS },
  { id: Permission.READ_APP, scope: ORGANIZATION, dependsOn: Permission.LIST_AGENTS },
  { id: Permission.READ_APP_STATS, scope: ORGANIZATION, dependsOn: Permission.LIST_AGENTS },
  { id: Permission.DELETE_APP, scope: ORGANIZATION, dependsOn: Permission.LIST_AGENTS },
  { id: Permission.LIST_PROJECTS_BY_ORGANIZATION, scope: ORGANIZATION, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.CREATE_PROJECT, scope: ORGANIZATION, dependsOn: Permission.LIST_PROJECTS_BY_ORGANIZATION },
  { id: Permission.LIST_ORGANIZATION_MEMBERS, scope: ORGANIZATION, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.MANAGE_ORG_GRANTS, scope: ORGANIZATION, dependsOn: Permission.LIST_ORGANIZATION_MEMBERS },
  { id: Permission.MANAGE_ORG_ROLES, scope: ORGANIZATION, dependsOn: Permission.READ_ORGANIZATION },
  { id: Permission.READ_PROJECT, scope: PROJECT },
  { id: Permission.UPDATE_PROJECT, scope: PROJECT, dependsOn: Permission.READ_PROJECT },
  { id: Permission.DELETE_PROJECT, scope: PROJECT, dependsOn: Permission.READ_PROJECT },
  { id: Permission.LIST_PROJECT_MEMBERS, scope: PROJECT, dependsOn: Permission.READ_PROJECT },
  { id: Permission.MANAGE_PROJECT_GRANTS, scope: PROJECT, dependsOn: Permission.LIST_PROJECT_MEMBERS },
  { id: Permission.LIST_PIPELINES_BY_PROJECT, scope: PROJECT, dependsOn: Permission.READ_PROJECT },
  { id: Permission.READ_PIPELINE, scope: PROJECT, dependsOn: Permission.LIST_PIPELINES_BY_PROJECT },
  { id: Permission.CREATE_PIPELINE, scope: PROJECT, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.UPDATE_PIPELINE, scope: PROJECT, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.DELETE_PIPELINE, scope: PROJECT, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.RUN_PIPELINE, scope: PROJECT, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.MANAGE_TRIGGERS, scope: PROJECT, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.LIST_JOBS_BY_PIPELINE, scope: PROJECT, dependsOn: Permission.READ_PIPELINE },
  { id: Permission.READ_JOB_LOGS, scope: PROJECT, dependsOn: Permission.LIST_JOBS_BY_PIPELINE },
  { id: Permission.DELETE_JOB, scope: PROJECT, dependsOn: Permission.LIST_JOBS_BY_PIPELINE },
  { id: Permission.LIST_SECRETS, scope: PROJECT, dependsOn: Permission.READ_PROJECT },
  { id: Permission.CREATE_SECRET, scope: PROJECT, dependsOn: Permission.LIST_SECRETS },
  { id: Permission.DELETE_SECRET, scope: PROJECT, dependsOn: Permission.LIST_SECRETS },
];

const DEFINITION_BY_PERMISSION = new Map<Permission, PermissionDefinition>(
  PERMISSION_CATALOG.map(definition => [definition.id, definition]),
);

export const getPermissionDefinition = (permission: Permission): PermissionDefinition | undefined =>
  DEFINITION_BY_PERMISSION.get(permission);

export const isEditablePermission = (permission: Permission): boolean =>
  DEFINITION_BY_PERMISSION.has(permission);

export const ALL_SCOPES: PermissionScope[] = [SYSTEM, ORGANIZATION, PROJECT];

/** A role may confer the permissions of its scope and of every broader one. */
const SCOPE_HIERARCHY: Record<PermissionScope, PermissionScope[]> = {
  [PermissionScope.SYSTEM]: [SYSTEM, ORGANIZATION, PROJECT],
  [PermissionScope.ORGANIZATION]: [ORGANIZATION, PROJECT],
  [PermissionScope.PROJECT]: [PROJECT],
  [PermissionScope.UNSPECIFIED]: [],
};

export const getPermissionDefinitionsForScope = (
  scope: PermissionScope,
): PermissionDefinition[] => {
  const allowed = SCOPE_HIERARCHY[scope] ?? [];
  return PERMISSION_CATALOG.filter(definition => allowed.includes(definition.scope));
};

/** Never shown by the editor at a scope, and written on the user's behalf. */
interface ImplicitPermission {
  id: Permission;
  /** Takes its place (adopts its children, ticking it writes `id` too). Absent: always conferred, shown locked. */
  standsIn?: Permission;
}

/**
 * What each scope confers without asking, because it is what the scope already means:
 * - organization: READ_ORGANIZATION is belonging; READ_PROJECT rides on
 *   LIST_PROJECTS_BY_ORGANIZATION (listing every project without opening any is useless).
 * - system: MANAGE_SYSTEM_GRANTS rides on MANAGE_ROLES (who writes roles hands them out).
 */
const IMPLICIT_PERMISSIONS_BY_SCOPE: Partial<Record<PermissionScope, ImplicitPermission[]>> = {
  [PermissionScope.SYSTEM]: [
    { id: Permission.MANAGE_SYSTEM_GRANTS, standsIn: Permission.MANAGE_ROLES },
  ],
  [PermissionScope.ORGANIZATION]: [
    { id: Permission.READ_ORGANIZATION },
    { id: Permission.READ_PROJECT, standsIn: Permission.LIST_PROJECTS_BY_ORGANIZATION },
    { id: Permission.READ_PIPELINE, standsIn: Permission.LIST_PIPELINES_BY_PROJECT },
  ],
  [PermissionScope.PROJECT]: [
    { id: Permission.READ_PIPELINE, standsIn: Permission.LIST_PIPELINES_BY_PROJECT },
  ],
};

const getImplicitAtScope = (scope: PermissionScope): ImplicitPermission[] =>
  IMPLICIT_PERMISSIONS_BY_SCOPE[scope] ?? [];

/** The ticked, locked rows above the tree. */
export const getAlwaysGrantedPermissionsForScope = (scope: PermissionScope): Permission[] =>
  getImplicitAtScope(scope)
    .filter(entry => entry.standsIn === undefined)
    .map(entry => entry.id);

export const isHiddenAtScope = (permission: Permission, scope: PermissionScope): boolean =>
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

/** What the editor renders. A child of a hidden entry hangs under its stand-in, or becomes a root. */
export const getEditablePermissionDefinitionsForScope = (
  scope: PermissionScope,
): PermissionDefinition[] => {
  const implicit = getImplicitAtScope(scope);
  const hidden = new Set(implicit.map(entry => entry.id));
  const standInFor = new Map(
    implicit
      .filter(entry => entry.standsIn !== undefined)
      .map(entry => [entry.id, entry.standsIn!] as const),
  );

  return getPermissionDefinitionsForScope(scope)
    .filter(definition => !hidden.has(definition.id))
    .map(definition => {
      if (definition.dependsOn === undefined) return definition;
      const substitute = standInFor.get(definition.dependsOn);
      return substitute === undefined ? definition : { ...definition, dependsOn: substitute };
    });
};

export const getPermissionsForScope = (scope: PermissionScope): Permission[] =>
  getPermissionDefinitionsForScope(scope).map(definition => definition.id);

/** The candidates the author may not tick at `scope`: a stand-in also needs what it carries. */
export const lockedPermissionsOf = (
  candidates: readonly Permission[],
  scope: PermissionScope,
  effective: EffectivePermissionsEntity | null,
  organizationId: string | null,
): Set<Permission> =>
  new Set(
    candidates.filter(
      candidate =>
        !carriedBy(scope, candidate).every(permission =>
          holdsPermission(effective, organizationId, permission),
        ),
    ),
  );
