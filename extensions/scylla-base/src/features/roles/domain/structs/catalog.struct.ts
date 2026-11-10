import type { RoleHolder, RoleLevel } from '../entities/role.entity.ts';

export const ACTIONS = ['view', 'create', 'edit', 'delete', 'run', 'manage'] as const;

export type CatalogAction = (typeof ACTIONS)[number];

export interface CatalogPermission {
  /** `<area>.<action>`. */
  id: string;
  action: string;
  dependsOn: string[];
  /** Each role of the level of the area has it. */
  implicit: boolean;
}

export interface CatalogArea {
  id: string;
  level: RoleLevel;
  /** Only a role for apps holds it. */
  machine: boolean;
  permissions: CatalogPermission[];
}

const RANK: Record<RoleLevel, number> = { platform: 0, workspace: 1, project: 2 };

/**
 * The ids of the permissions of a role that the caller does not hold, so it cannot give the role.
 * An implicit permission does not count, and so does a permission of a machine: no person holds it.
 */
export const missingPermissionIds = (
  role: { permissions: readonly string[] },
  held: ReadonlySet<string>,
  areas: readonly CatalogArea[],
): string[] => {
  const free = new Set(
    areas.flatMap(area =>
      area.permissions.filter(one => one.implicit || area.machine).map(one => one.id),
    ),
  );
  return role.permissions.filter(id => !held.has(id) && !free.has(id));
};

/** A role holds the areas of its level and of the levels under it. */
export const levelCovers = (level: RoleLevel, area: RoleLevel): boolean =>
  RANK[level] <= RANK[area];

export const canHoldArea = (area: CatalogArea, level: RoleLevel, holder: RoleHolder): boolean =>
  levelCovers(level, area.level) && (!area.machine || holder === 'apps');

export const permissionsFor = (
  areas: readonly CatalogArea[],
  level: RoleLevel,
  holder: RoleHolder,
): CatalogPermission[] =>
  areas.filter(area => canHoldArea(area, level, holder)).flatMap(area => area.permissions);

const isImplicitFor = (area: CatalogArea, permission: CatalogPermission, level: RoleLevel) =>
  permission.implicit && area.level === level;

/** Takes out what is always on at some level: another level has no reason to keep it. */
export const withoutImplicit = (
  selected: ReadonlySet<string>,
  areas: readonly CatalogArea[],
): Set<string> => {
  const implicit = areas
    .flatMap(area => area.permissions)
    .filter(permission => permission.implicit)
    .map(permission => permission.id);
  return new Set([...selected].filter(id => !implicit.includes(id)));
};

/** The permission that shows each workspace of the instance in the list of the workspaces. */
export const VIEW_ALL_WORKSPACES = 'workspaces.view';

/**
 * What a permission needs in a role of a level: its `dependsOn`, and, in a role of the platform,
 * the view of each workspace for a permission of a workspace or of a project. The server adds the
 * same permissions.
 */
export const needsOf = (
  id: string,
  areas: readonly CatalogArea[],
  level: RoleLevel,
): readonly string[] => {
  const area = areas.find(one => one.permissions.some(permission => permission.id === id));
  const permission = area?.permissions.find(one => one.id === id);
  if (!area || !permission) return [];
  const viewsAll =
    level === 'platform' &&
    area.level !== 'platform' &&
    areas.some(one => one.permissions.some(other => other.id === VIEW_ALL_WORKSPACES));
  return viewsAll ? [...permission.dependsOn, VIEW_ALL_WORKSPACES] : permission.dependsOn;
};

const closure = (ids: Iterable<string>, next: (id: string) => readonly string[]): Set<string> => {
  const seen = new Set<string>();
  const stack = [...ids];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...next(id));
  }
  return seen;
};

/** Keeps what a role of this level can hold, and adds what it needs and what is always on. */
export const fitToRole = (
  selected: ReadonlySet<string>,
  areas: readonly CatalogArea[],
  level: RoleLevel,
  holder: RoleHolder,
): Set<string> => {
  const holdable = areas.filter(area => canHoldArea(area, level, holder));
  const kept = holdable.flatMap(area =>
    area.permissions.filter(permission => selected.has(permission.id)).map(one => one.id),
  );
  const wanted = closure(kept, id => needsOf(id, areas, level));
  const fitted = new Set<string>();
  for (const area of holdable) {
    for (const permission of area.permissions) {
      if (wanted.has(permission.id) || isImplicitFor(area, permission, level)) {
        fitted.add(permission.id);
      }
    }
  }
  return fitted;
};

/** Checking a permission also checks what it needs. Unchecking it also unchecks what needs it. */
export const togglePermission = (
  selected: ReadonlySet<string>,
  id: string,
  areas: readonly CatalogArea[],
  level: RoleLevel,
): Set<string> => {
  const all = areas.flatMap(area => area.permissions);
  const needs = (of: string) => needsOf(of, areas, level);
  const result = new Set(selected);
  if (selected.has(id)) {
    const needers = (of: string) =>
      all.filter(permission => needs(permission.id).includes(of)).map(permission => permission.id);
    for (const removed of closure([id], needers)) result.delete(removed);
    return result;
  }
  for (const added of closure([id], needs)) result.add(added);
  return result;
};

/** Checks each permission as one click on its cell does. */
export const checkPermissions = (
  selected: ReadonlySet<string>,
  ids: readonly string[],
  areas: readonly CatalogArea[],
  level: RoleLevel,
): Set<string> =>
  ids.reduce(
    (next, id) => (next.has(id) ? next : togglePermission(next, id, areas, level)),
    new Set(selected),
  );

/** Unchecks each permission as one click on its cell does. */
export const uncheckPermissions = (
  selected: ReadonlySet<string>,
  ids: readonly string[],
  areas: readonly CatalogArea[],
  level: RoleLevel,
): Set<string> =>
  ids.reduce(
    (next, id) => (next.has(id) ? togglePermission(next, id, areas, level) : next),
    new Set(selected),
  );
