/**
 * The order of the cards of a section, and the pins of a person. A move puts a card before another
 * card of the section, or last when that card is not there: the server applies the same rule
 * (`MoveProject`), so the order of the page and the order of the server stay equal.
 */
export type ProjectLayout = readonly string[];

/** The pins of one person in one workspace: at most 100, the filter of a list allows no more. */
export const MAX_PINS = 100;

/** The order with `id` before `beforeId`, or last. The card leaves its old place first. */
export const placeBefore = (order: ProjectLayout, id: string, beforeId?: string): string[] => {
  const rest = order.filter(other => other !== id);
  const index = beforeId === undefined ? -1 : rest.indexOf(beforeId);
  return index < 0 ? [...rest, id] : [...rest.slice(0, index), id, ...rest.slice(index)];
};

/** The pins with one more project at the end, at most `MAX_PINS`. A pinned project stays. */
export const withPin = (pins: ProjectLayout, id: string): string[] =>
  pins.includes(id) || pins.length >= MAX_PINS ? [...pins] : [...pins, id];

/** The pins with no `id`. */
export const withoutPin = (pins: ProjectLayout, id: string): string[] =>
  pins.filter(other => other !== id);
