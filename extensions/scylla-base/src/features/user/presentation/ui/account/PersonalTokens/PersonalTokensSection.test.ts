import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { findFloating, focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import PersonalTokensSection from './PersonalTokensSection.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

const token = (id: string, expiresIn: number, overrides: Record<string, unknown> = {}) => ({
  id,
  name: id,
  hint: 'scyp_...x7Q2',
  createdBy: 'u-1',
  createdAt: at(-10),
  expiresAt: at(expiresIn),
  lastUsedAt: '',
  revokedAt: '',
  limits: { preset: 'read_only', actions: [], projectIds: [] },
  ...overrides,
});

const TOKENS = [
  token('laptop-cli', 62.2, { limits: { preset: 'full', actions: [], projectIds: [] } }),
  token('report-script', 5.2),
  token('old-cli', -3),
];

let teardown: Array<() => void> = [];
let users: Record<string, ReturnType<typeof vi.fn>>;

const setUp = (state: Record<string, unknown> = {}) => {
  contextStore.setState({ workspace: { id: 'ws-1', name: 'acme', slug: 'acme' } });
  users = {
    listPersonalTokens: vi
      .fn()
      .mockResolvedValue({ tokens: TOKENS, enabled: true, refusedWorkspaceIds: [], ...state }),
    createPersonalToken: vi.fn().mockResolvedValue({
      token: token('nightly', 90),
      secret: 'scyp_SECRET',
    }),
    revokePersonalToken: vi.fn().mockResolvedValue(undefined),
  };
  const projects = {
    getByWorkspaceId: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 100, total: 0 },
    }),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      user: { userRepository: users },
      project: { projectRepository: projects },
    }),
  ];
  render(PersonalTokensSection);
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => teardown.forEach(restore => restore()));

describe('PersonalTokensSection', () => {
  it('lists the tokens with their limits, their expiry and their last use', async () => {
    setUp();

    expect(await screen.findByText('laptop-cli')).toBeInTheDocument();
    expect(screen.getByText('Full · all projects')).toBeInTheDocument();
    expect(screen.getByText('Expires in 62 days')).toBeInTheDocument();
    const soon = screen.getByText('Expires in 5 days');
    expect(soon.closest('span')).toHaveClass('text-warning');
    const expired = screen.getByText(/Expired on/);
    expect(expired.closest('span')).toHaveClass('text-destructive');
    expect(screen.getAllByText('Never').length).toBe(3);
  });

  it('makes a token and shows its secret one time', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'New token' }));
    const dialog = await screen.findByRole('dialog');
    await focusSettled();
    await user.type(within(dialog).getByLabelText('Token name'), 'nightly');
    await user.click(within(dialog).getByRole('button', { name: 'Create token' }));

    await waitFor(() =>
      expect(users.createPersonalToken).toHaveBeenCalledWith({
        name: 'nightly',
        expiry: 90,
        limits: { preset: 'read_only', actions: [], projectIds: [] },
      }),
    );
    expect(await within(dialog).findByText('scyp_SECRET')).toBeInTheDocument();
    expect(within(dialog).getByText('Your new token')).toBeInTheDocument();
    expect(within(dialog).getByText(/ListWorkspacePipelines/)).toBeInTheDocument();
  });

  it('asks for a name before it makes a token', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'New token' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByRole('button', { name: 'Create token' })).toBeDisabled();
  });

  it('revokes a token after a confirmation', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Actions of old-cli' }));
    await user.click(await findFloating('menuitem', 'Revoke'));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Revoke old-cli?')).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(users.revokePersonalToken).toHaveBeenCalledWith('old-cli'));
  });

  it('offers nothing to revoke on a revoked token', async () => {
    setUp({ tokens: [token('gone', 30, { revokedAt: at(-1) })] });

    expect(await screen.findByText('gone')).toBeInTheDocument();
    expect(screen.getByText(/Revoked on/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actions of gone' })).not.toBeInTheDocument();
  });

  it('says that the server turned the tokens off, and offers no new one', async () => {
    setUp({ enabled: false });

    expect(await screen.findByText('Personal tokens are turned off on this server')).toBeVisible();
    expect(screen.getAllByText('Turned off').length).toBe(3);
    expect(screen.queryByRole('button', { name: 'New token' })).not.toBeInTheDocument();
  });

  it('says that this workspace turned the tokens off, and keeps the new token', async () => {
    setUp({ refusedWorkspaceIds: ['ws-1'] });

    expect(
      await screen.findByText('Personal tokens are turned off in this workspace'),
    ).toBeVisible();
    expect(screen.getByText(/An admin of acme turned them off/)).toBeInTheDocument();
    expect(screen.getByText('Expires in 62 days')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New token' })).toBeInTheDocument();
  });

  it('says nothing about another workspace that refuses the tokens', async () => {
    setUp({ refusedWorkspaceIds: ['ws-2'] });

    await screen.findByText('laptop-cli');
    expect(
      screen.queryByText('Personal tokens are turned off in this workspace'),
    ).not.toBeInTheDocument();
  });

  it('says so when there is no token yet', async () => {
    setUp({ tokens: [] });

    expect(await screen.findByText('No personal token yet.')).toBeInTheDocument();
  });
});

const onAPhone = () => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe('PersonalTokensSection on a phone', () => {
  it('shows cards, not a table, with the same facts', async () => {
    onAPhone();
    setUp();

    expect(await screen.findByText('laptop-cli')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Full · all projects')).toBeInTheDocument();
    expect(screen.getByText('Expires in 5 days').closest('span')).toHaveClass('text-warning');
    expect(screen.getByRole('button', { name: 'Actions of old-cli' })).toBeInTheDocument();
  });
});
