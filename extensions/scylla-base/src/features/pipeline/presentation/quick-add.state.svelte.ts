import type { XYPosition } from '@xyflow/svelte';
import type { StepLink } from './blueprint.state.svelte.ts';
import {
  groupCatalog,
  searchCatalog,
  type CatalogEntry,
  type CatalogText,
} from './utils/node-catalog.ts';

/** Where the menu opened, and where the step it picks goes. */
export interface QuickAddRequest {
  /** In the window: places the menu. */
  client: XYPosition;
  /** On the canvas: places the new step. */
  flow: XYPosition;
  link: StepLink;
}

export interface QuickAddParams {
  entries: () => readonly CatalogEntry[];
  resolve: (text: CatalogText) => string;
  onPick: (entry: CatalogEntry, request: QuickAddRequest) => void;
}

export const MENU_SIZE = { width: 300, height: 400 } as const;
const MARGIN = 8;
/** The menu opens a little above the point, so that the search sits next to it. */
const LIFT = 24;

/** The corner of the menu: next to the point, but kept inside the window. */
export const menuPosition = (
  client: XYPosition,
  viewport: { width: number; height: number },
): XYPosition => ({
  x: Math.max(MARGIN, Math.min(client.x + MARGIN, viewport.width - MENU_SIZE.width - MARGIN)),
  y: Math.max(MARGIN, Math.min(client.y - LIFT, viewport.height - MENU_SIZE.height - MARGIN)),
});

/** The menu that picks a step where a link was dropped, driven from the keyboard or the mouse. */
export const createQuickAdd = (params: QuickAddParams) => {
  let request = $state<QuickAddRequest | null>(null);
  let query = $state('');
  let active = $state(0);

  const groups = $derived(groupCatalog(searchCatalog(params.entries(), query, params.resolve)));
  // In the order the groups show them, so that the arrows follow the screen.
  const results = $derived(groups.flatMap(group => group.items));

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
    get groups() {
      return groups;
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
