import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import WorkspaceSettingsPage from './WorkspaceSettings.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];
let workspaces: Record<string, ReturnType<typeof vi.fn>>;

const setUp = (personalTokensEnabled: boolean, serverEnabled = true) => {
  contextStore.setState({ workspace: { id: 'ws-1', name: 'acme', slug: 'acme' } });
  const entity = { id: 'ws-1', name: 'acme', slug: 'acme', personalTokensEnabled, timeZone: 'UTC' };
  workspaces = {
    getMine: vi.fn().mockResolvedValue([entity]),
    setPersonalTokens: vi.fn((_id: string, enabled: boolean) =>
      Promise.resolve({ ...entity, personalTokensEnabled: enabled }),
    ),
    setTimeZone: vi.fn((_id: string, timeZone: string) => Promise.resolve({ ...entity, timeZone })),
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
const theZone = () =>
  screen.findByRole<HTMLInputElement>('combobox', { name: 'Time zone of acme' });

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

  it('shows the zone of the workspace, and the zone of the browser as a hint', async () => {
    setUp(true);
    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const user = userEvent.setup();

    expect((await theZone()).value).toBe('UTC');
    const body = `The stats of acme count their days and hours in this zone. This browser is in ${browser}.`;
    expect(screen.getByText(body)).toBeInTheDocument();

    await user.click(await theZone());
    const first = (await screen.findAllByRole('option', { hidden: true }))[0];
    expect(first?.textContent.trim()).toBe(`${browser} This browser`);
  });

  it('saves the zone that the user picks', async () => {
    setUp(true);
    const user = userEvent.setup();

    await user.type(await theZone(), 'europe/paris');
    const rows = await screen.findAllByRole('option', { hidden: true });
    expect(rows).toHaveLength(1);
    await user.click(rows[0]);

    await waitFor(() =>
      expect(workspaces.setTimeZone).toHaveBeenCalledWith('ws-1', 'Europe/Paris'),
    );
  });

  describe('the icon at the top', () => {
    afterEach(() => permissionsStore.setState({ permissions: null }));

    it('opens the icon picker for a member who may edit the workspace, and saves the choice', async () => {
      permissionsStore.setState({
        permissions: {
          scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
        },
      });
      setUp(true);
      workspaces.update = vi.fn((id: string) =>
        Promise.resolve({ id, name: 'acme', slug: 'acme', personalTokensEnabled: true, timeZone: 'UTC' }),
      );
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Change the icon…' }));
      const dialog = await screen.findByRole('dialog', { name: 'Workspace icon' });
      await user.click(within(dialog).getByRole('button', { name: 'Color 2' }));
      await user.click(within(dialog).getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(workspaces.update).toHaveBeenCalledWith('ws-1', undefined, undefined, {
          kind: 'glyph',
          name: 'building',
          color: 'chart-2',
        }),
      );
    });

    it('shows the icon with no button to a member who may not edit the workspace', async () => {
      setUp(true);

      await theSwitch();
      expect(document.querySelector('[data-slot="workspace-icon"]')).not.toBeNull();
      expect(screen.queryByRole('button', { name: 'Change the icon…' })).not.toBeInTheDocument();
    });
  });
});
