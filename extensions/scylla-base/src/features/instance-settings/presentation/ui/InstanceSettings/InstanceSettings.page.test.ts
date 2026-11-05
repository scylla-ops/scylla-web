import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import InstanceSettingsPage from './InstanceSettings.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];
let repository: Record<string, ReturnType<typeof vi.fn>>;

const setUp = (
  personalTokensEnabled: boolean,
  activePersonalTokens = 14,
  access: unknown = { kind: 'fullControl' },
) => {
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access }],
    },
  } as never);
  repository = {
    get: vi.fn().mockResolvedValue({ personalTokensEnabled, activePersonalTokens }),
    setPersonalTokens: vi.fn((enabled: boolean) =>
      Promise.resolve({ personalTokensEnabled: enabled, activePersonalTokens }),
    ),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      'instance-settings': { instanceSettingsRepository: repository },
      user: { userRepository: {} },
    }),
  ];
  render(InstanceSettingsPage);
};

const theSwitch = () => screen.findByRole('switch', { name: 'Personal tokens' });

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('InstanceSettingsPage', () => {
  it('shows the state of the personal tokens', async () => {
    setUp(true);

    expect(await theSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('heading', { name: 'API access' })).toBeInTheDocument();
  });

  it('asks before it turns the tokens off, with the number of tokens that stop', async () => {
    setUp(true);
    const user = userEvent.setup();

    await user.click(await theSwitch());
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Turn off personal tokens?')).toBeInTheDocument();
    expect(within(confirm).getByText(/14 tokens stop working at once/)).toBeInTheDocument();
    expect(repository.setPersonalTokens).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole('button', { name: 'Turn off' }));

    await waitFor(() => expect(repository.setPersonalTokens).toHaveBeenCalledWith(false));
    await waitFor(async () => expect(await theSwitch()).toHaveAttribute('aria-checked', 'false'));
  });

  it('keeps the tokens on when the user cancels', async () => {
    setUp(true);
    const user = userEvent.setup();

    await user.click(await theSwitch());
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));

    expect(repository.setPersonalTokens).not.toHaveBeenCalled();
    expect(await theSwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it('turns the tokens on with no confirmation', async () => {
    setUp(false);
    const user = userEvent.setup();

    await user.click(await theSwitch());

    await waitFor(() => expect(repository.setPersonalTokens).toHaveBeenCalledWith(true));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('InstanceSettingsPage without the right', () => {
  it('locks the switch', async () => {
    setUp(true, 14, { kind: 'restricted', permissions: [Permission.READ_USER] });

    expect(await theSwitch()).toBeDisabled();
  });
});
