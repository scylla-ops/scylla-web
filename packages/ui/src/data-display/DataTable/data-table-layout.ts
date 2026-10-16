import { getContext, setContext } from 'svelte';

const KEY = Symbol('data-table-layout');

export interface DataTableLayout {
  /** True while the table is a list of cards: a cell can pick a denser rendering. */
  readonly isCard: boolean;
}

const TABLE: DataTableLayout = { isCard: false };

export const setDataTableLayout = (layout: DataTableLayout): void => {
  setContext(KEY, layout);
};

/** The layout of the enclosing `DataTable`. Call it while a cell component initialises. */
export const getDataTableLayout = (): DataTableLayout =>
  getContext<DataTableLayout | undefined>(KEY) ?? TABLE;
