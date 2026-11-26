import type { MoveProjectInput } from '@base/features/project/domain/entities/project-group.entity.ts';
import {
  MAX_PINS,
  placeBefore,
} from '@base/features/project/domain/structs/project-layout.struct.ts';
import type {
  ProjectCounts,
  ProjectSection,
} from '@base/features/project/domain/structs/project-search.struct.ts';

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
 * The place of a drop on a card: before it when the pointer is on its first half, else before
 * the card after it. The dragged card is not in `ids`.
 */
export const dropBefore = (
  ids: readonly string[],
  overId: string,
  secondHalf: boolean,
): string | undefined => (secondHalf ? ids[ids.indexOf(overId) + 1] : overId);

/** The health line of a section header: the failures first, then the jobs that run. */
export const sectionHealth = (
  counts: ProjectCounts | undefined,
): { kind: 'failed' | 'running'; count: number } | undefined => {
  if (counts?.failed) return { kind: 'failed', count: counts.failed };
  if (counts?.running) return { kind: 'running', count: counts.running };
  return undefined;
};
