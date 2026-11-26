import type { MoveProjectInput } from '@base/features/project/domain/entities/project-group.entity.ts';
import {
  MAX_PINS,
  placeBefore,
} from '@base/features/project/domain/structs/project-layout.struct.ts';
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
const placeIn = (zone: SectionZone, center: Point): DropTarget => {
  const ids = zone.cells.flatMap(cell => (cell.id ? [cell.id] : []));
  const boxes = zone.cells.map(cell => cell.box);
  const index = nearestCell(zone.after ? [...boxes, zone.after] : boxes, center);
  return { to: zone.key, beforeId: index < 0 ? undefined : ids[index], header: false };
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
