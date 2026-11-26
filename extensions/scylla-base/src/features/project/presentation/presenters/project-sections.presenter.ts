import type { MoveProjectInput } from '@base/features/project/domain/entities/project-group.entity.ts';
import {
  MAX_PINS,
  placeBefore,
} from '@base/features/project/domain/structs/project-layout.struct.ts';
import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
import type {
  ProjectCounts,
  ProjectSection,
} from '@base/features/project/domain/structs/project-search.struct.ts';
import { t } from '@scylla/ui/i18n';
import { projectMessages } from '../messages/project.messages.ts';
import { nearestCell, type Box, type Point } from './sortable.presenter.ts';

/** The key of a section of the page: `pins`, `ungrouped`, or the id of a group. */
export type SectionKey = string;
export const PINS: SectionKey = 'pins';
export const UNGROUPED: SectionKey = 'ungrouped';

/** In the reorder mode, each section shows each of its cards. */
export const REORDER_LIMIT = 1000;

/** A drop of the reorder mode: a card goes before another card of a section, or last. */
export interface CardMove {
  id: string;
  to: SectionKey;
  beforeId?: string;
}

/** The section of the search of the server. The pins have none: they filter by ids. */
export const searchSectionOf = (key: SectionKey): ProjectSection | undefined =>
  key === PINS
    ? undefined
    : key === UNGROUPED
      ? { kind: 'ungrouped' }
      : { kind: 'group', groupId: key };

/** The section of the cards of a project, out of the pins. */
export const homeOf = (groupId: string | undefined): SectionKey => groupId ?? UNGROUPED;

/**
 * The cards of each section after the drops. A drop on the pins pins the card, and the card stays
 * in its group. A drop on another section takes the card out of its old group. The server applies
 * the same rule (`MoveProject`), so the page and the server give the same order.
 */
export const applyMoves = (
  orders: Readonly<Record<SectionKey, readonly string[]>>,
  moves: readonly CardMove[],
): Record<SectionKey, string[]> => {
  const next = Object.fromEntries(Object.entries(orders).map(([key, ids]) => [key, [...ids]]));
  for (const { id, to, beforeId } of moves) {
    if (to === PINS) {
      const pins = next[PINS] ?? [];
      next[PINS] =
        pins.includes(id) || pins.length < MAX_PINS ? placeBefore(pins, id, beforeId) : pins;
      continue;
    }
    for (const key of Object.keys(next)) {
      if (key !== PINS) next[key] = next[key].filter(other => other !== id);
    }
    next[to] = placeBefore(next[to] ?? [], id, beforeId);
  }
  return next;
};

/** The `MoveProject` calls of the drops, in their order. The pins are a key of the person. */
export const movesToSave = (moves: readonly CardMove[]): MoveProjectInput[] =>
  moves
    .filter(move => move.to !== PINS)
    .map(({ id, to, beforeId }) => ({
      id,
      ...(to !== UNGROUPED && { groupId: to }),
      ...(beforeId && { beforeId }),
    }));

/** The cards before and after a card of a section: « Move up » and « Move down » swap with them. */
export const neighborsOf = (
  ids: readonly string[],
  id: string,
): { previous?: string; next?: string } => {
  const index = ids.indexOf(id);
  if (index < 0) return {};
  return { previous: ids[index - 1], next: ids[index + 1] };
};

/** Where a dragged card goes: before a card of a section, or last. `header`: on the header. */
export interface DropTarget {
  to: SectionKey;
  beforeId?: string;
  header: boolean;
}

/** A cell of a grid in the reorder mode: a card, or the slot (no id). */
export interface CardCell {
  id?: string;
  box: Box;
}

/** A section of the page as the drag measures it, in the viewport. */
export interface SectionZone {
  key: SectionKey;
  /** None when the page shows the cards with no header. */
  header?: Box;
  /** Under the header: the grid or the empty zone. None when the section is closed. */
  body?: Box;
  /** The cards and the slot, in their order, without the dragged card. */
  cells: readonly CardCell[];
  /** The free cell after the last one: a drop there puts the card last. */
  after?: Box | null;
}

const spans = (box: Box | undefined, y: number) =>
  !!box && y >= box.top && y <= box.top + box.height;

/**
 * The slot goes to the cell nearest to the center of the dragged card: it takes the place of a
 * card when the dragged card covers more than half of it.
 */
const placeIn = (zone: SectionZone, center: Point): DropTarget => ({
  to: zone.key,
  beforeId: beforeIdAt(zone.cells, zone.after ?? null, center) ?? undefined,
  header: false,
});

/**
 * The item before which the slot goes: the cell nearest to the center of the dragged item, the
 * slot (no id) included. A cell after the slot takes the slot after it: the index of a box in the
 * cells is the index of the id after it in the ids with no slot. `undefined`: last. Null: no cell.
 */
const beforeIdAt = (
  cells: readonly CardCell[],
  after: Box | null,
  center: Point,
): string | undefined | null => {
  const ids = cells.flatMap(cell => (cell.id ? [cell.id] : []));
  const boxes = cells.map(cell => cell.box);
  const index = nearestCell(after ? [...boxes, after] : boxes, center);
  return index < 0 ? null : ids[index];
};

/**
 * Where the dragged card goes. The center of the card decides, wherever the person took it; the
 * pointer decides only out of each section. A header takes the card last in its section. Only the
 * height chooses the section: the sections take the whole width. Null out of each section that
 * takes the card: the slot stays where it is.
 */
export const cardTargetAt = (
  zones: readonly SectionZone[],
  center: Point,
  pointer: Point,
  accepts: (key: SectionKey) => boolean,
): DropTarget | null => {
  const open = zones.filter(zone => accepts(zone.key));
  for (const { y } of [center, pointer]) {
    const header = open.find(zone => spans(zone.header, y));
    if (header) return { to: header.key, header: true };
    const body = open.find(zone => spans(zone.body, y));
    if (body) return placeIn(body, center);
  }
  return null;
};

/** The place of a slot in the cards of a section, from 1, and the count with the dragged card. */
export const slotPlace = (
  ids: readonly string[],
  dragId: string,
  beforeId?: string,
): { place: number; count: number } => {
  const others = ids.filter(id => id !== dragId);
  const at = beforeId ? others.indexOf(beforeId) : -1;
  return { place: (at < 0 ? others.length : at) + 1, count: others.length + 1 };
};

/** What the reorder mode tells a screen reader about a drag. */
export interface ReorderNewsInput {
  drag: { id: string; name: string } | null;
  target: DropTarget | null;
  /** The end of the last drag. `to`: the section of the drop; null: no drop. */
  ended: { id: string; name: string; to: SectionKey | null } | null;
  idsOf: (key: SectionKey) => readonly string[];
  nameOf: (key: SectionKey) => string;
}

/** The text of the live region of the reorder mode: the place of the slot, then of the drop. */
export const reorderNews = ({ drag, target, ended, idsOf, nameOf }: ReorderNewsInput): string => {
  if (drag && target) {
    const section = nameOf(target.to);
    if (target.header) {
      return t(
        target.to === PINS
          ? projectMessages.releaseToPin(drag.name)
          : projectMessages.releaseInto(drag.name, section),
      );
    }
    const { place, count } = slotPlace(idsOf(target.to), drag.id, target.beforeId);
    return t(projectMessages.slotPlace(drag.name, place, count, section));
  }
  if (!ended) return '';
  if (!ended.to) return t(projectMessages.dragCancelled(ended.name));
  const ids = idsOf(ended.to);
  const place = ids.indexOf(ended.id) + 1;
  return place > 0
    ? t(projectMessages.droppedAt(ended.name, place, ids.length, nameOf(ended.to)))
    : t(projectMessages.droppedInto(ended.name, nameOf(ended.to)));
};

/** The health line of a section header: the failures first, then the jobs that run. */
export const sectionHealth = (
  counts: ProjectCounts | undefined,
): { kind: 'failed' | 'running'; count: number } | undefined => {
  if (counts?.failed) return { kind: 'failed', count: counts.failed };
  if (counts?.running) return { kind: 'running', count: counts.running };
  return undefined;
};

/** Where a dragged group goes: before another group, or last of the groups. */
export interface GroupTarget {
  beforeId?: string;
}

/**
 * Where a dragged group goes, as a card in a grid of one column: the slot goes to the group
 * nearest to the center of the dragged header. The pins stay first and « No group » last: they are
 * not cells. Null with no cell.
 */
export const groupTargetAt = (
  cells: readonly CardCell[],
  after: Box | null,
  center: Point,
): GroupTarget | null => {
  const beforeId = beforeIdAt(cells, after, center);
  return beforeId === null ? null : { beforeId };
};

/** The groups in the order of the reorder mode; a group that the mode does not know comes last. */
export const inGroupOrder = (
  groups: readonly ProjectGroupEntity[],
  order: readonly string[] | null,
): ProjectGroupEntity[] => {
  if (!order) return [...groups];
  const known = order.flatMap(id => groups.filter(group => group.id === id));
  return [...known, ...groups.filter(group => !order.includes(group.id))];
};

/** A group moves one place up (-1) or down (+1). The first group does not go up, nor the last down. */
export const stepGroup = (order: readonly string[], id: string, delta: -1 | 1): string[] => {
  const index = order.indexOf(id);
  const to = index + delta;
  if (index < 0 || to < 0 || to >= order.length) return [...order];
  return moveGroupTo(order, id, to);
};

/** A group goes to a place of the order, from 0. */
export const moveGroupTo = (order: readonly string[], id: string, position: number): string[] => {
  const next = order.filter(other => other !== id);
  next.splice(Math.max(0, Math.min(position, next.length)), 0, id);
  return next;
};

/** One `UpdateProjectGroup` with a new place, from 0. */
export interface GroupMove {
  groupId: string;
  position: number;
}

/**
 * The writes that give the server the order of the page, in their order. Each write puts one group
 * at its place, from the first place: the groups before it are then at their place.
 */
export const groupMovesToSave = (
  saved: readonly string[],
  wanted: readonly string[],
): GroupMove[] => {
  const order = [...saved];
  const moves: GroupMove[] = [];
  wanted
    .filter(id => saved.includes(id))
    .forEach((id, position) => {
      if (order[position] === id) return;
      order.splice(order.indexOf(id), 1);
      order.splice(position, 0, id);
      moves.push({ groupId: id, position });
    });
  return moves;
};

/** What the reorder mode tells a screen reader about a group that moves. */
export interface GroupNewsInput {
  drag: { id: string; name: string; keyboard: boolean } | null;
  /** The order of the groups in the mode. */
  order: readonly string[];
  /** The slot of a pointer drag. */
  target: GroupTarget | null;
  /** A keyboard drag moved the group at least once. */
  stepped: boolean;
  ended: { id: string; name: string; dropped: boolean } | null;
}

/** The text of the live region for the groups: the lift, each place, then the drop or the cancel. */
export const groupNews = ({ drag, order, target, stepped, ended }: GroupNewsInput): string => {
  if (drag) {
    const { place, count } = drag.keyboard
      ? { place: order.indexOf(drag.id) + 1, count: order.length }
      : slotPlace(order, drag.id, target?.beforeId);
    return t(
      drag.keyboard && !stepped
        ? projectMessages.groupLifted(drag.name, place, count)
        : projectMessages.groupPlace(drag.name, place, count),
    );
  }
  if (!ended) return '';
  if (!ended.dropped) return t(projectMessages.dragCancelled(ended.name));
  return t(projectMessages.groupDropped(ended.name, order.indexOf(ended.id) + 1, order.length));
};
