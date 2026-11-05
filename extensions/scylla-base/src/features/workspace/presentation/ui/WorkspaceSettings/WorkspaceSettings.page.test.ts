import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import WorkspaceSettingsPage from './WorkspaceSettings.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];
let workspaces: Record<string, ReturnType<typeof vi.fn>>;

const setUp = (personalTokensEnabled: boolean, serverEnabled = true) => {
  contextStore.setState({ workspace: { id: 'ws-1', name: 'acme', slug: 'acme' } });
  const entity = { id: 'ws-1', name: 'acme', slug: 'acme', personalTokensEnabled };
  workspaces = {
    getMine: vi.fn().mockResolvedValue([entity]),
    setPersonalTokens: vi.fn((_id: string, enabled: boolean) =>
      Promise.resolve({ ...entity, personalTokensEnabled: enabled }),
    ),
  };
  const users = {
    listPersonalTokens: vi
      .fn()
      .mockResolvedValue({ tokens: [], enabled: serverEnabled, refusedWorkspaceIds: [] }),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      workspace: { workspaceRepository: workspaces },
      user: { userRepository: users },
    }),
  ];
  render(WorkspaceSettingsPage);
};

const theSwitch = () => screen.findByRole('switch', { name: 'Personal tokens in acme' });

beforeEach(() => vi.clearAllMocks());
afterEach(() => teardown.forEach(restore => restore()));

describe('WorkspaceSettingsPage', () => {
  it('asks before this workspace refuses the tokens', async () => {
    setUp(true);
    const user = userEvent.setup();

    expect(await theSwitch()).toHaveAttribute('aria-checked', 'true');
    await user.click(await theSwitch());
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Turn off personal tokens in acme?')).toBeInTheDocument();
    expect(workspaces.setPersonalTokens).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole('button', { name: 'Turn off' }));

    await waitFor(() => expect(workspaces.setPersonalTokens).toHaveBeenCalledWith('ws-1', false));
  });

  it('allows the tokens again with no confirmation', async () => {
    setUp(false);
    const user = userEvent.setup();

    await user.click(await theSwitch());

    await waitFor(() => expect(workspaces.setPersonalTokens).toHaveBeenCalledWith('ws-1', true));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('is off and locked while the server refuses the tokens', async () => {
    setUp(true, false);
    const user = userEvent.setup();

    await waitFor(async () => expect(await theSwitch()).toHaveAttribute('aria-checked', 'false'));
    expect(await theSwitch()).toBeDisabled();
    expect(screen.getByText(/An instance admin turned personal tokens off/)).toBeInTheDocument();

    await user.click(await theSwitch());
    expect(workspaces.setPersonalTokens).not.toHaveBeenCalled();
  });
});
