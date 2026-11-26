import type { MessageDescriptor } from '@lingui/core';
import type {
  ProjectHealth,
  ProjectOrder,
} from '@base/features/project/domain/structs/project-search.struct.ts';
import { projectMessages } from '../messages/project.messages.ts';

/** The cards of the first batch: two rows of three on a desktop, three on a phone. */
export const FIRST_CARDS = 6;
export const PHONE_FIRST_CARDS = 3;
/** The cards that "Show more" adds. */
export const MORE_CARDS = 12;

/** The orders that the page offers, the default first: the custom order of the workspace. */
export const PAGE_ORDERS = [
  'position',
  'name',
  'last-job',
  'failed-first',
] as const satisfies readonly ProjectOrder[];
export type PageOrder = (typeof PAGE_ORDERS)[number];
export const DEFAULT_ORDER: PageOrder = 'position';

/** The name of an order in the list of the orders, and on the button of the closed list. */
export const ORDER_LABELS: Record<PageOrder, { item: MessageDescriptor; trigger: MessageDescriptor }> = {
  position: { item: projectMessages.sortCustom, trigger: projectMessages.sortedByCustom },
  name: { item: projectMessages.sortName, trigger: projectMessages.sortedByName },
  'last-job': { item: projectMessages.sortLastJob, trigger: projectMessages.sortedByLastJob },
  'failed-first': {
    item: projectMessages.sortFailedFirst,
    trigger: projectMessages.sortedByFailedFirst,
  },
};

/** The parameter `health` of the URL. Any other value: each project. */
export const healthOfParam = (value: string): ProjectHealth =>
  value === 'failed' || value === 'running' ? value : 'all';

/** The parameter `sort` of the URL. Any other value: the default order. */
export const orderOfParam = (value: string): PageOrder =>
  PAGE_ORDERS.find(order => order === value) ?? DEFAULT_ORDER;

/**
 * The projects of the page in batches: the first batch, then one batch for each "Show more". A
 * card reads the data of its pipelines and of its repository for its whole batch, in one call.
 */
export const batchesOf = (
  ids: readonly string[],
  first: number,
  more: number = MORE_CARDS,
): string[][] => {
  const batches = [ids.slice(0, first)];
  for (let start = first; start < ids.length; start += more) {
    batches.push(ids.slice(start, start + more));
  }
  return batches.filter(batch => batch.length > 0);
};

/** The number of cards that "Show more" adds: 12 (`more`), or what is left. */
export const nextBatchSize = (shown: number, total: number, more: number = MORE_CARDS): number =>
  Math.max(0, Math.min(more, total - shown));
