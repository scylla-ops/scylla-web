import type { XYPosition } from '@xyflow/svelte';
import { searchCatalog, type CatalogEntry, type CatalogText } from './utils/node-catalog.ts';

/** Where the menu opened, and where the step it picks goes. */
export interface QuickAddRequest {
  /** In the window: places the menu. */
  client: XYPosition;
  /** On the canvas: places the new step. */
  flow: XYPosition;
  /** The node the dropped link came from. */
  after?: string;
  /** The edge the step is inserted into. */
  replacing?: string;
}

export interface QuickAddParams {
  entries: () => readonly CatalogEntry[];
  resolve: (text: CatalogText) => string;
  onPick: (entry: CatalogEntry, request: QuickAddRequest) => void;
}

/** The menu that picks a step where a link was dropped, driven from the keyboard or the mouse. */
export const createQuickAdd = (params: QuickAddParams) => {
  let request = $state<QuickAddRequest | null>(null);
  let query = $state('');
  let active = $state(0);

  const results = $derived(searchCatalog(params.entries(), query, params.resolve));

  return {
    get request() {
      return request;
    },
    get query() {
      return query;
    },
    set query(next: string) {
      query = next;
      active = 0;
    },
    get results() {
      return results;
    },
    get active() {
      return active;
    },

    open(next: QuickAddRequest) {
      request = next;
      query = '';
      active = 0;
    },
    close() {
      request = null;
    },
    /** Wraps around both ends. */
    move(delta: number) {
      if (results.length === 0) return;
      active = (active + delta + results.length) % results.length;
    },
    pick(entry: CatalogEntry | undefined = results[active]) {
      if (!request || !entry) return;
      params.onPick(entry, request);
      request = null;
    },
  };
};

export type QuickAdd = ReturnType<typeof createQuickAdd>;
