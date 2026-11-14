import { t } from '@scylla/ui/i18n';
import type { RoleEntity } from '../../domain/entities/role.entity.ts';
import {
  ACTION_ORDER,
  permissionsFor,
  type CatalogArea,
} from '../../domain/structs/catalog.struct.ts';
import { actionLabels, areaLabels, fullControlHints } from '../messages/roles.messages.ts';

/** One resource of a role and its actions: "Pipelines Edit · Run". */
export interface PermissionChip {
  area: string;
  title: string;
  actions: string[];
}

export type PermissionSummary =
  | { kind: 'full'; hint: string }
  | { kind: 'viewOnly'; areas: string }
  | { kind: 'chips'; chips: PermissionChip[] }
  | { kind: 'none' };

const split = (id: string) => {
  const at = id.lastIndexOf('.');
  return { area: id.slice(0, at), action: id.slice(at + 1) };
};

const rankIn = (order: readonly string[], id: string) => {
  const at = order.indexOf(id);
  return at === -1 ? order.length : at;
};

const areaTitle = (id: string) => {
  const label = areaLabels[id];
  return label ? t(label.title) : id;
};

const actionLabel = (action: string) => {
  const label = actionLabels[action];
  return label ? t(label) : action;
};

const holdsAll = (role: RoleEntity, areas: readonly CatalogArea[]) => {
  const all = permissionsFor(areas, role.level, role.holder);
  const held = new Set(role.permissions);
  return all.length > 0 && all.every(permission => held.has(permission.id));
};

const isViewOnly = (actions: readonly string[]) => actions.length === 1 && actions[0] === 'view';

/**
 * What a role can do, for the list. An implicit permission says nothing about the role, and View
 * goes away beside an action that needs it. The resources that change something come first.
 */
export const permissionSummary = (
  role: RoleEntity,
  areas: readonly CatalogArea[],
): PermissionSummary => {
  if (role.fullControl || holdsAll(role, areas)) {
    return { kind: 'full', hint: t(fullControlHints[role.level]) };
  }

  const implicit = new Set(
    areas.flatMap(area => area.permissions.filter(one => one.implicit).map(one => one.id)),
  );
  const byArea = new Map<string, string[]>();
  for (const id of role.permissions.filter(one => !implicit.has(one))) {
    const { area, action } = split(id);
    byArea.set(area, [...(byArea.get(area) ?? []), action]);
  }
  if (byArea.size === 0) return { kind: 'none' };

  const order = areas.map(area => area.id);
  const grouped = [...byArea]
    .sort(([a], [b]) => rankIn(order, a) - rankIn(order, b))
    .map(([area, actions]) => ({
      area,
      actions: (actions.length > 1 ? actions.filter(one => one !== 'view') : actions).sort(
        (a, b) => rankIn(ACTION_ORDER, a) - rankIn(ACTION_ORDER, b),
      ),
    }));

  if (grouped.every(group => isViewOnly(group.actions))) {
    return {
      kind: 'viewOnly',
      areas: grouped.map(group => areaTitle(group.area).toLowerCase()).join(', '),
    };
  }

  const chips = grouped.map(group => ({
    area: group.area,
    title: areaTitle(group.area),
    actions: group.actions.map(actionLabel),
    viewOnly: isViewOnly(group.actions),
  }));
  return {
    kind: 'chips',
    chips: [...chips.filter(chip => !chip.viewOnly), ...chips.filter(chip => chip.viewOnly)].map(
      ({ area, title, actions }) => ({ area, title, actions }),
    ),
  };
};
