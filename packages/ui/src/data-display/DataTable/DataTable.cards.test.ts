import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { renderComponent } from '@tanstack/svelte-table';
import { render } from '@test/render.svelte.ts';
import DataTable from './DataTable.fixture.svelte';
import LayoutProbe from './LayoutProbe.fixture.svelte';
import { data, type Datum } from './data-table.fixture.ts';
import { CARD_LAYOUT_WIDTH_PX, type DataTableColumn } from '../data-table.ts';

type Notify = (entries: Array<{ contentRect: { width: number } }>) => void;
let notify: Notify | null = null;

// The table measures its own box: the test decides how wide it is.
beforeEach(() => {
  notify = null;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: Notify) {
        notify = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

const resizeTo = (width: number) => {
  notify?.([{ contentRect: { width } }]);
  flushSync();
};

const columns: DataTableColumn<Datum>[] = [
  { id: 'name', header: 'Name', accessorKey: 'name', meta: { card: 'title' } },
  { id: 'status', header: 'Status', accessorKey: 'status' },
  { id: 'secret', header: 'Secret', cell: () => 'hidden value', meta: { card: 'hidden' } },
  {
    id: 'layout',
    header: 'Layout',
    cell: () => renderComponent(LayoutProbe, {}),
    meta: { card: 'body' },
  },
];

const cards = () => screen.getAllByRole('listitem');

describe('DataTable as cards', () => {
  it('stays a table while its box is wide enough', () => {
    render(DataTable, { columns, data });
    resizeTo(CARD_LAYOUT_WIDTH_PX);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('becomes one card per row below the breakpoint, and a table again above it', () => {
    render(DataTable, { columns, data });

    resizeTo(375);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(cards()).toHaveLength(2);

    resizeTo(1024);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('labels a meta cell with its column header, and drops hidden columns', () => {
    render(DataTable, { columns, data });
    resizeTo(375);

    const first = within(cards()[0]);
    expect(first.getByText('build')).toBeInTheDocument();
    expect(first.getByRole('term')).toHaveTextContent('Status');
    expect(first.getByRole('definition')).toHaveTextContent('running');
    expect(first.queryByText('hidden value')).not.toBeInTheDocument();
  });

  it('tells a cell it is in a card, so it can pick a denser rendering', () => {
    render(DataTable, { columns, data });
    expect(screen.getAllByText('in a table')).toHaveLength(2);

    resizeTo(375);
    expect(screen.getAllByText('in a card')).toHaveLength(2);
  });

  it('keeps tap-to-select: a click on a card calls onRowClick and the selection shows', async () => {
    const onRowClick = vi.fn();
    render(DataTable, {
      columns,
      data,
      onRowClick,
      isRowSelected: (datum: Datum) => datum.id === 'p-2',
    });
    resizeTo(375);

    await userEvent.click(screen.getByText('build'));
    expect(onRowClick.mock.calls[0][0].original.id).toBe('p-1');

    const states = cards().map(card => card.firstElementChild?.getAttribute('data-state'));
    expect(states).toEqual([null, 'selected']);
  });

  it('shows "No results." in card mode too', () => {
    render(DataTable, { columns, data: [] });
    resizeTo(375);

    expect(screen.getByText('No results.')).toBeInTheDocument();
  });
});
