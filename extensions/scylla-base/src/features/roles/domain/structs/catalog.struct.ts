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

/** The ids of the permissions of a role that the caller does not hold, so it cannot give the role. */
export const missingPermissionIds = (
  role: { permissions: readonly string[] },
  held: ReadonlySet<string>,
  areas: readonly CatalogArea[],
): string[] => {
  const implicit = new Set(
    areas.flatMap(area => area.permissions.filter(one => one.implicit).map(one => one.id)),
  );
  return role.permissions.filter(id => !held.has(id) && !implicit.has(id));
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

/** Keeps what a role of this level can hold, and adds what is always on. */
export const fitToRole = (
  selected: ReadonlySet<string>,
  areas: readonly CatalogArea[],
  level: RoleLevel,
  holder: RoleHolder,
): Set<string> => {
  const fitted = new Set<string>();
  for (const area of areas.filter(area => canHoldArea(area, level, holder))) {
    for (const permission of area.permissions) {
      if (selected.has(permission.id) || isImplicitFor(area, permission, level)) {
        fitted.add(permission.id);
      }
    }
  }
  return fitted;
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

/** Checking a permission also checks what it depends on. Unchecking it also unchecks what needs it. */
export const togglePermission = (
  selected: ReadonlySet<string>,
  id: string,
  areas: readonly CatalogArea[],
): Set<string> => {
  const all = areas.flatMap(area => area.permissions);
  const result = new Set(selected);
  if (selected.has(id)) {
    const needers = (of: string) =>
      all.filter(permission => permission.dependsOn.includes(of)).map(permission => permission.id);
    for (const removed of closure([id], needers)) result.delete(removed);
    return result;
  }
  const needs = (of: string) => all.find(permission => permission.id === of)?.dependsOn ?? [];
  for (const added of closure([id], needs)) result.add(added);
  return result;
};
