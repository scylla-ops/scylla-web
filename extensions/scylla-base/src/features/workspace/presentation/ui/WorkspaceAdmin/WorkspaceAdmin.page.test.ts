import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type {
  WorkspaceEntity,
  WorkspacePage,
  WorkspaceSearch,
} from '@base/features/workspace/domain/entities/workspace.entity.ts';
import WorkspaceAdmin from './WorkspaceAdmin.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

Element.prototype.getAnimations ??= () => [];

const personal = (id: string, owner: string, email: string): WorkspaceEntity => ({
  id,
  name: 'Personal',
  slug: `personal-${id}`,
  personalTokensEnabled: true,
  timeZone: 'UTC',
  createdAt: new Date('2026-11-01T10:00:00Z'),
  owner: { id: `user-${id}`, username: owner.toLowerCase(), displayName: owner, email },
  memberCount: 3,
  projectCount: 7,
  role: '',
});

const alice: WorkspaceEntity = {
  ...personal('ws-1', 'Alice Martin', 'alice@example.test'),
  icon: { kind: 'glyph', name: 'rocket', color: 'chart-2' },
};
const bob = personal('ws-2', 'Bob Stone', 'bob@example.test');

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;
let listAll: ReturnType<typeof vi.fn<(search: WorkspaceSearch) => Promise<WorkspacePage>>>;

const setUp = (search = '') => {
  navigator = installTestNavigator({ pathname: '/admin/workspaces', search });
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ workspace: { workspaceRepository: { listAll } } }),
    navigator.restore,
  ];
  render(WorkspaceAdmin);
};

/** The search of the last call to the server. */
const lastSearch = () => listAll.mock.lastCall?.[0];

beforeEach(() => {
  vi.clearAllMocks();
  contextStore.setState({ workspace: { id: null, name: null, slug: null } });
  // Two pages: the token of the second page is `t2`.
  listAll = vi.fn((search: WorkspaceSearch) =>
    Promise.resolve(
      search.pageToken === 't2'
        ? { items: [bob], nextToken: '', total: 21 }
        : { items: [alice], nextToken: 't2', total: 21 },
    ),
  );
});

afterEach(() => {
  teardown.forEach(restore => restore());
});

describe('WorkspaceAdmin', () => {
  it('shows each workspace with its owner, its email and its counts', async () => {
    setUp();

    expect(await screen.findByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('alice@example.test')).toBeInTheDocument();
    const name = screen.getByRole('button', { name: 'Open the workspace Personal' });
    // The icon of the workspace, before its name.
    expect(name.parentElement?.querySelector('[data-slot="workspace-icon"] svg')).toHaveAttribute(
      'stroke',
      'var(--chart-2)',
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(lastSearch()).toEqual({
      query: '',
      order: 'name',
      othersOnly: false,
      pageSize: 20,
      pageToken: '',
    });
  });

  it('starts with the search of the switcher', async () => {
    setUp('?q=alice');

    await screen.findByText('Alice Martin');

    expect(screen.getByRole('searchbox')).toHaveValue('alice');
    expect(lastSearch()?.query).toBe('alice');
  });

  it('searches on the server by the owner, from the first page', async () => {
    setUp();
    await screen.findByText('Alice Martin');
    await fireEvent.click(screen.getByLabelText('Go to next page'));
    await waitFor(() => expect(lastSearch()?.pageToken).toBe('t2'));

    await userEvent.type(screen.getByRole('searchbox'), 'martin');

    await waitFor(() => expect(lastSearch()).toMatchObject({ query: 'martin', pageToken: '' }));
  });

  it('goes to the next page with the token of the server, and back', async () => {
    setUp();
    await screen.findByText('Alice Martin');

    await fireEvent.click(screen.getByLabelText('Go to next page'));

    expect(await screen.findByText('Bob Stone')).toBeInTheDocument();
    expect(lastSearch()?.pageToken).toBe('t2');
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    await fireEvent.click(screen.getByLabelText('Go to previous page'));

    expect(await screen.findByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('opens a workspace from its name, with the keyboard', async () => {
    setUp();
    const open = await screen.findByRole('button', { name: 'Open the workspace Personal' });

    open.focus();
    await userEvent.keyboard('{Enter}');

    expect(contextStore.getState().workspace).toEqual({
      id: 'ws-1',
      name: 'Personal',
      slug: 'personal-ws-1',
    });
    expect(navigator.navigate).toHaveBeenCalledTimes(1);
    expect(navigator.navigate).toHaveBeenCalledWith('/personal-ws-1/dashboard', undefined);
  });

  it('tells when no workspace matches the search', async () => {
    listAll.mockResolvedValue({ items: [], nextToken: '', total: 0 });
    setUp('?q=nobody');

    expect(await screen.findByText('No workspace matches this search.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Go to next page')).not.toBeInTheDocument();
  });
});
