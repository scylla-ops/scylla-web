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
import { insertIndex, zoneAt, type Box, type Point } from '@scylla/ui/dnd';

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

/**
 * Where a dragged card goes: before a card of a section, or last. `header`: into a section that
 * shows no card (folded, or the zone of the pins over the toolbar), last.
 */
export interface DropTarget {
  to: SectionKey;
  beforeId?: string;
  header: boolean;
}

export const sameTarget = (a: DropTarget | null, b: DropTarget | null): boolean =>
  a?.to === b?.to && a?.beforeId === b?.beforeId && !!a?.header === !!b?.header;

/** A section of the page as the drag measures it, in the viewport. */
export interface SectionZone {
  key: SectionKey;
  /** The whole section: its header, its cards and the gaps between them. */
  box: Box;
  /** It shows its cards: a drop goes between them. Else a drop puts the card last. */
  open: boolean;
  /** The cards without the dragged one, where the grid places them, in their order. */
  cells: readonly { id: string; box: Box }[];
  /** The columns of the grid. */
  columns: number;
}

/** The section under the pointer, and the place of the card in it when the section takes it. */
export interface CardAim {
  over: SectionKey | null;
  target: DropTarget | null;
}

/**
 * Where the dragged card goes. The pointer decides, wherever the person took the card: a section
 * takes it over its whole box (header, cards, gaps) and a margin around it (`zoneAt`). In an open
 * section, the place comes from the pointer against the middle of each card, with a hysteresis
 * (`insertIndex`), so that the slot does not swing. A section that shows no card takes it last.
 * `target` is null out of each section, and over a section that takes no drop of the card.
 */
export const cardTargetAt = (
  zones: readonly SectionZone[],
  pointer: Point,
  accepts: (key: SectionKey) => boolean,
  current: DropTarget | null,
): CardAim => {
  const over = zoneAt(zones, pointer, { current: current?.to ?? null });
  const zone = zones.find(item => item.key === over);
  if (!zone || !accepts(zone.key)) return { over, target: null };
  if (!zone.open) return { over, target: { to: zone.key, header: true } };
  const ids = zone.cells.map(cell => cell.id);
  const now =
    current?.to === zone.key && !current.header
      ? current.beforeId
        ? ids.indexOf(current.beforeId)
        : ids.length
      : -1;
  const index = insertIndex(
    zone.cells.map(cell => cell.box),
    pointer,
    { current: now < 0 ? null : now, columns: zone.columns },
  );
  return { over, target: { to: zone.key, beforeId: ids[index], header: false } };
};

/** A section for the keyboard: it shows its cards (`open`), and their ids in their order. */
export interface KeyboardSection {
  key: SectionKey;
  open: boolean;
  ids: readonly string[];
}

/**
 * The places of a card that the keyboard moves, in the order of the page: each place in each open
 * section that takes the card, and one place, last, in a section that shows no card.
 */
export const keyboardTargets = (
  sections: readonly KeyboardSection[],
  dragId: string,
  accepts: (key: SectionKey) => boolean,
): DropTarget[] =>
  sections
    .filter(section => accepts(section.key))
    .flatMap((section): DropTarget[] => {
      if (!section.open) return [{ to: section.key, header: true }];
      const others = section.ids.filter(id => id !== dragId);
      return [
        ...others.map(id => ({ to: section.key, beforeId: id, header: false })),
        { to: section.key, header: false },
      ];
    });

/** The place one step from `current`: the first or the last place stays where it is. */
export const stepTarget = (
  targets: readonly DropTarget[],
  current: DropTarget,
  delta: -1 | 1,
): DropTarget => {
  const index = targets.findIndex(target => sameTarget(target, current));
  if (index < 0) return targets[0] ?? current;
  return targets[index + delta] ?? current;
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
  drag: { id: string; name: string; keyboard?: boolean } | null;
  target: DropTarget | null;
  /** The place of the card when the drag started. */
  origin?: DropTarget | null;
  /** The section under the card that has it already. */
  refused?: SectionKey | null;
  /** The end of the last drag. `to`: the section of the drop; null: no drop. */
  ended: { id: string; name: string; to: SectionKey | null } | null;
  idsOf: (key: SectionKey) => readonly string[];
  nameOf: (key: SectionKey) => string;
}

/**
 * The text of the live region of the reorder mode: the lift, the place of the slot, a section that
 * has the card already, then the drop or the cancel.
 */
export const reorderNews = ({
  drag,
  target,
  origin = null,
  refused = null,
  ended,
  idsOf,
  nameOf,
}: ReorderNewsInput): string => {
  if (drag && refused) {
    return t(
      refused === PINS
        ? projectMessages.alreadyPinnedDrop(drag.name)
        : projectMessages.alreadyInDrop(drag.name, nameOf(refused)),
    );
  }
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
    if (sameTarget(target, origin)) {
      return t(
        drag.keyboard
          ? projectMessages.cardLifted(drag.name, place, count, section)
          : projectMessages.cardPicked(drag.name, place, count, section),
      );
    }
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

/** The kinds of the health line of a section header, in their order. */
const SECTION_HEALTHS = ['failed', 'running', 'pending'] as const;

/** The health line of a section header: the failures first, then the jobs that run, then wait. */
export const sectionHealth = (
  counts: ProjectCounts | undefined,
): { kind: (typeof SECTION_HEALTHS)[number]; count: number } | undefined => {
  const kind = SECTION_HEALTHS.find(health => counts?.[health]);
  return kind && counts ? { kind, count: counts[kind] } : undefined;
};

/** The dot and the text of each health of a section header: the colors of the status shapes. */
export const SECTION_HEALTH_LOOKS = {
  failed: { dot: 'bg-destructive', text: projectMessages.sectionFailing },
  running: { dot: 'bg-warning', text: projectMessages.sectionRunning },
  pending: { dot: 'bg-status-queued', text: projectMessages.sectionPending },
} as const;

/** Where a dragged group goes: before another group, or last of the groups. */
export interface GroupTarget {
  beforeId?: string;
}

/** A group of the page as the drag of a group measures it: its top and its bottom, in the viewport. */
export interface GroupCell {
  id: string;
  top: number;
  bottom: number;
}

/**
 * Where a dragged group goes: the line before the first group whose middle is under the pointer
 * (`y`), with a hysteresis around each middle (`insertIndex`). The groups stay in their place during
 * the drag, the dragged one too: it is not a place. The pins stay first and « No group » last: they
 * are not cells. Null with no cell.
 */
export const groupTargetAt = (
  cells: readonly GroupCell[],
  dragId: string,
  y: number,
  current: GroupTarget | null = null,
): GroupTarget | null => {
  if (cells.length === 0) return null;
  const others = cells.filter(cell => cell.id !== dragId);
  const now = current
    ? current.beforeId
      ? others.findIndex(cell => cell.id === current.beforeId)
      : others.length
    : -1;
  const index = insertIndex(
    others.map(cell => ({ left: 0, top: cell.top, width: 1, height: cell.bottom - cell.top })),
    { x: 0, y },
    { current: now < 0 ? null : now },
  );
  return { beforeId: others[index]?.id };
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
    // The keyboard moves the group in the order; after a drop, the order has the new place.
    const { place, count } =
      drag.keyboard || !target
        ? { place: order.indexOf(drag.id) + 1, count: order.length }
        : slotPlace(order, drag.id, target.beforeId);
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
