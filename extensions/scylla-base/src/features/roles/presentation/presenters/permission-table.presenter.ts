import type { RoleHolder, RoleLevel } from '../../domain/entities/role.entity.ts';
import {
  ACTIONS,
  canHoldArea,
  checkPermissions,
  uncheckPermissions,
  type CatalogAction,
  type CatalogArea,
} from '../../domain/structs/catalog.struct.ts';
import { t } from '@scylla/ui/i18n';
import {
  actionLabels,
  areaLabels,
  needsOthers,
  rolesMessages,
} from '../messages/roles.messages.ts';

const LEVELS: readonly RoleLevel[] = ['platform', 'workspace', 'project'];

export interface LevelTab {
  level: RoleLevel;
  areas: CatalogArea[];
  count: number;
  total: number;
}

/** One tab for each level that has areas the role can hold. The areas of a machine go last. */
export const levelTabs = (
  areas: readonly CatalogArea[],
  level: RoleLevel,
  holder: RoleHolder,
  selected: ReadonlySet<string>,
): LevelTab[] =>
  LEVELS.map(tab => {
    const held = areas
      .filter(area => area.level === tab && canHoldArea(area, level, holder))
      .sort((a, b) => Number(a.machine) - Number(b.machine));
    const ids = held.flatMap(area => area.permissions.map(permission => permission.id));
    return {
      level: tab,
      areas: held,
      count: ids.filter(id => selected.has(id)).length,
      total: ids.length,
    };
  }).filter(tab => tab.areas.length > 0);

/** `always`: on at this level, no one changes it. `locked`: the caller cannot give it. */
export type PermissionCell =
  | { action: CatalogAction; kind: 'none' }
  | {
      action: CatalogAction;
      kind: 'always' | 'locked' | 'open';
      id: string;
      checked: boolean;
      notHeld: boolean;
      /** The ids of the permissions that a click also checks. */
      needs: readonly string[];
    };

/** The name of a permission in the table: its area, then its action. */
export const permissionLabel = (id: string, areas: readonly CatalogArea[]): string => {
  for (const area of areas) {
    const permission = area.permissions.find(one => one.id === id);
    if (!permission) continue;
    const title = areaLabels[area.id] ? t(areaLabels[area.id].title) : area.id;
    const action = actionLabels[permission.action];
    return `${title} · ${action ? t(action) : permission.action}`;
  }
  return id;
};

/** What a cell tells on hover: why it is locked, or what a click on it also checks. */
export const cellTitle = (
  cell: Extract<PermissionCell, { id: string }>,
  areas: readonly CatalogArea[],
): string | undefined => {
  if (cell.notHeld) return t(rolesMessages.lockedCell);
  if (cell.needs.length === 0) return undefined;
  return t(needsOthers(cell.needs.map(id => permissionLabel(id, areas)).join(', ')));
};

export interface PermissionRow {
  area: CatalogArea;
  cells: PermissionCell[];
  /** The cells that a click can change. */
  open: string[];
}

const cellOf = (
  area: CatalogArea,
  action: CatalogAction,
  level: RoleLevel,
  selected: ReadonlySet<string>,
  held: ReadonlySet<string> | undefined,
): PermissionCell => {
  const permission = area.permissions.find(one => one.action === action);
  if (!permission) return { action, kind: 'none' };
  const checked = selected.has(permission.id);
  const notHeld = held !== undefined && !permission.implicit && !held.has(permission.id);
  const kind =
    permission.implicit && area.level === level
      ? 'always'
      : notHeld && !checked
        ? 'locked'
        : 'open';
  return { action, kind, id: permission.id, checked, notHeld, needs: permission.dependsOn };
};

export const permissionRows = (
  areas: readonly CatalogArea[],
  level: RoleLevel,
  selected: ReadonlySet<string>,
  held?: ReadonlySet<string>,
): PermissionRow[] =>
  areas.map(area => {
    const cells = ACTIONS.map(action => cellOf(area, action, level, selected, held));
    return { area, cells, open: cells.flatMap(cell => (cell.kind === 'open' ? [cell.id] : [])) };
  });

export const openInColumn = (rows: readonly PermissionRow[], action: CatalogAction): string[] =>
  rows.flatMap(row =>
    row.cells.flatMap(cell => (cell.kind === 'open' && cell.action === action ? [cell.id] : [])),
  );

export const openInTab = (rows: readonly PermissionRow[]): string[] =>
  rows.flatMap(row => row.open);

export type Mark = 'none' | 'some' | 'all';

export const markOf = (ids: readonly string[], selected: ReadonlySet<string>): Mark => {
  const count = ids.filter(id => selected.has(id)).length;
  if (count === 0) return 'none';
  return count === ids.length ? 'all' : 'some';
};

/** A tab, a row or a column: when all its cells are on, a click clears them, else it selects them. */
export const flipAll = (
  ids: readonly string[],
  selected: ReadonlySet<string>,
  areas: readonly CatalogArea[],
): Set<string> =>
  markOf(ids, selected) === 'all'
    ? uncheckPermissions(selected, ids, areas)
    : checkPermissions(selected, ids, areas);
