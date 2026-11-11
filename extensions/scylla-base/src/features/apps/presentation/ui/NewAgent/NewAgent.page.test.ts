import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { holdsLeave } from '@scylla/core-sdk';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { fakePollTimers } from '@test/queries.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
import NewAgentPage from './NewAgent.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const IMAGE = 'ghcr.io/scylla-ops/scylla-agent:0.7.0';

const app = (connected: boolean, patch: Partial<AppEntity> = {}): AppEntity => ({
  id: 'a1',
  workspaceId: 'ws-1',
  name: 'agent-1',
  runner: true,
  connected,
  lastSeenAt: connected ? '2026-01-01T00:00:00.000Z' : '',
  host: connected
    ? {
        version: '0.7.0',
        os: 'linux',
        arch: 'x86_64',
        hostname: 'host-1',
        cpuCount: 8,
        totalMemoryMb: 16384,
        capacity: 2,
        containerRuntime: 'docker',
      }
    : null,
  createdBy: 'u-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  runningJobs: 0,
  disabledAt: '',
  ...patch,
});

const key = (id: string) => ({ id, label: 'host-1', createdAt: '', revokedAt: '', lastUsedAt: '' });

const code = (code: string, inMs = 900_000) => ({
  code,
  expiresAt: new Date(Date.now() + inMs).toISOString(),
});

const PROJECTS = [
  { id: 'p-1', name: 'api' },
  { id: 'p-2', name: 'web' },
];

let navigator: ReturnType<typeof installTestNavigator>;
let teardown: Array<() => void> = [];

const setUp = (options: { projects?: typeof PROJECTS; pathname?: string } = {}) => {
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: {
            kind: 'restricted',
            permissions: [
              Permission.CREATE_APP,
              Permission.READ_APP,
              Permission.CREATE_JOIN_CODE,
              Permission.DELETE_APP,
            ],
          },
        },
      ],
    },
  });
  contextStore.getState().setWorkspace('ws-1', 'Acme', 'acme');
  const apps = {
    getServerInfo: vi.fn().mockResolvedValue({ version: '0.7.0', agentImage: IMAGE }),
    createApp: vi.fn().mockResolvedValue({
      app: app(false),
      joinCode: code('JOIN-42'),
      accessGranted: true,
    }),
    getApp: vi.fn().mockResolvedValue({ app: app(false), keys: [] }),
    createJoinCode: vi.fn().mockResolvedValue(code('JOIN-77')),
    deleteApp: vi.fn().mockResolvedValue(undefined),
  };
  const projects = {
    getByWorkspaceId: vi.fn().mockResolvedValue({
      items: options.projects ?? PROJECTS,
      pagination: { page: 1, pageSize: 100, total: (options.projects ?? PROJECTS).length },
    }),
  };
  const cache = withQueryClient();
  navigator = installTestNavigator({ pathname: options.pathname ?? '/acme/agents/new' });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({ apps: { appsRepository: apps }, project: { projectRepository: projects } }),
  ];
  return { apps };
};

/** Step 1 makes the agent, then the page of its URL mounts with the code of the creation. */
const createAgent = async (apps: ReturnType<typeof setUp>['apps'], name = 'agent-1') => {
  const user = userEvent.setup();
  const first = render(NewAgentPage, {});
  await user.type(screen.getByLabelText('Name'), name);
  await user.click(screen.getByRole('button', { name: 'Add agent' }));
  await waitFor(() =>
    expect(navigator.navigate).toHaveBeenCalledWith('/acme/agents/a1/connect', { replace: true }),
  );
  first.unmount();
  render(NewAgentPage, { appId: 'a1' });
  expect(apps.createJoinCode).not.toHaveBeenCalled();
  return user;
};

/** What the router does before a navigation of the user. */
const leave = () => {
  const go = vi.fn();
  return { go, held: holdsLeave(go) };
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('userId', 'u-1');
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
  contextStore.getState().setWorkspace(null, null, null);
  localStorage.removeItem('userId');
  vi.useRealTimers();
});

describe('the page of a new agent', () => {
  it('names the agent, shows the command of its code, and waits for its connection', async () => {
    fakePollTimers();
    const { apps } = setUp();
    apps.getApp
      .mockResolvedValueOnce({ app: app(false), keys: [] })
      .mockResolvedValue({ app: app(true), keys: [key('k1')] });

    await createAgent(apps);

    expect(apps.createApp).toHaveBeenCalledWith('ws-1', 'agent-1', true, []);
    expect(
      await screen.findByText(/install\.sh \| sh -s -- JOIN-42 --url http/),
    ).toBeInTheDocument();
    expect(screen.getByText('agent-1 · All projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Linux/, pressed: true })).toBeInTheDocument();
    expect(screen.getByText('In a terminal. Asks for sudo.')).toBeInTheDocument();
    expect(screen.getByText('Waiting for the agent…')).toBeInTheDocument();
    expect(screen.queryByText(/Checks every/)).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(2_000);

    expect(await screen.findByRole('heading', { name: 'agent-1 is online' })).toBeInTheDocument();
    expect(screen.getByText('Connected from host-1')).toBeInTheDocument();
    for (const fact of ['linux/x86_64', '8 CPU', '16 GB', '2 jobs at once', 'docker']) {
      expect(screen.getByText(fact)).toBeInTheDocument();
    }
    expect(screen.getByText('It takes jobs from all projects.')).toBeInTheDocument();
    expect(screen.getByText('Linux · Shell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to agents' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add another agent' })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Open agent' }));
    expect(navigator.navigate).toHaveBeenCalledWith('/acme/agents/a1', undefined);
  });

  it('gives the agent the projects that the user chose, in one step', async () => {
    const { apps } = setUp();
    apps.createApp.mockResolvedValueOnce({
      app: app(false, { id: 'a2' }),
      joinCode: code('JOIN-42'),
      accessGranted: true,
    });
    const user = userEvent.setup();
    render(NewAgentPage, {});

    await user.type(screen.getByLabelText('Name'), 'agent-1');
    await user.click(screen.getByRole('radio', { name: 'Some projects' }));
    expect(screen.getByRole('button', { name: 'Add agent' })).toBeDisabled();
    await user.click(await screen.findByRole('checkbox', { name: 'api' }));
    await user.click(screen.getByRole('button', { name: 'Add agent' }));

    await waitFor(() =>
      expect(apps.createApp).toHaveBeenCalledWith('ws-1', 'agent-1', true, ['p-1']),
    );
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
    expect(screen.queryByText(/reads only their secrets/)).not.toBeInTheDocument();
  });

  it('cannot choose some projects in a workspace with no project, and tells why', async () => {
    setUp({ projects: [] });
    render(NewAgentPage, {});

    const some = screen.getByRole('radio', { name: 'Some projects' });
    await waitFor(() => expect(some).toBeDisabled());
    expect(some).toHaveAccessibleDescription('No project in this workspace yet.');
    expect(screen.getByRole('radio', { name: 'All projects' })).toBeChecked();
  });

  it('opens an agent that exists at its install step, with a new code, on a reload or "Finish setup"', async () => {
    const { apps } = setUp({ pathname: '/acme/agents/a1/connect' });
    apps.getApp.mockResolvedValue({ app: app(false), keys: [key('k-old')] });

    render(NewAgentPage, { appId: 'a1' });

    expect(await screen.findByText(/-- JOIN-77 --url/)).toBeInTheDocument();
    expect(apps.createJoinCode).toHaveBeenCalledTimes(1);
    expect(apps.createJoinCode).toHaveBeenCalledWith('a1');
    expect(apps.createApp).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'New agent' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('gives the agent page back to a user who may not make a code', async () => {
    const { apps } = setUp({ pathname: '/acme/agents/a1/connect' });
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.WORKSPACE,
            scopeId: 'ws-1',
            access: { kind: 'restricted', permissions: [Permission.READ_APP] },
          },
        ],
      },
    });
    apps.getApp.mockResolvedValue({ app: app(false, { createdBy: 'u-other' }), keys: [] });

    render(NewAgentPage, { appId: 'a1' });

    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('/acme/agents/a1', { replace: true }),
    );
    expect(apps.createJoinCode).not.toHaveBeenCalled();
  });

  it('asks before the user leaves at the install step, and only before a machine joins', async () => {
    fakePollTimers();
    const { apps } = setUp();
    const first = render(NewAgentPage, {});
    screen.getByLabelText('Name');
    expect(leave().held).toBe(false);
    first.unmount();

    await createAgent(apps);
    await screen.findByText(/-- JOIN-42 --url/);
    const { held } = leave();

    expect(held).toBe(true);
    const prompt = await screen.findByRole('alertdialog');
    expect(within(prompt).getByText('Leave before agent-1 connects?')).toBeInTheDocument();
    for (const name of ['Stay', 'Keep agent', 'Delete agent']) {
      expect(within(prompt).getByRole('button', { name })).toBeInTheDocument();
    }

    await userEvent.setup().click(within(prompt).getByRole('button', { name: 'Stay' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    apps.getApp.mockResolvedValue({ app: app(false), keys: [key('k1')] });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(
      await screen.findByText('The machine joined. Waiting for its connection.'),
    ).toBeInTheDocument();
    expect(leave().held).toBe(false);
  });

  it('deletes the agent with "Delete agent", then leaves', async () => {
    const { apps } = setUp();
    const user = await createAgent(apps);
    await screen.findByText(/-- JOIN-42 --url/);
    const { go } = leave();

    await user.click(await screen.findByRole('button', { name: 'Delete agent' }));

    await waitFor(() => expect(go).toHaveBeenCalledTimes(1));
    expect(apps.deleteApp).toHaveBeenCalledWith('a1');
  });

  it('shows an expired code faded, with a new code at hand', async () => {
    const { apps } = setUp({ pathname: '/acme/agents/a1/connect' });
    apps.createJoinCode.mockResolvedValueOnce(code('JOIN-OLD', -1_000));
    const user = userEvent.setup();

    render(NewAgentPage, { appId: 'a1' });

    expect(await screen.findByText('This code expired')).toBeInTheDocument();
    expect(screen.getByText('Code expired')).toBeInTheDocument();
    expect(screen.getByText('Make a new code to continue.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: /New code/ })[0]);

    expect(await screen.findByText(/-- JOIN-77 --url/)).toBeInTheDocument();
    expect(screen.queryByText('This code expired')).not.toBeInTheDocument();
    expect(screen.getByText(/^Expires in \d+:\d\d$/)).toBeInTheDocument();
  });

  it('tells the two ways of Windows apart in the "i" card', async () => {
    const { apps } = setUp();
    const user = await createAgent(apps);
    await screen.findByText(/-- JOIN-42 --url/);

    await user.click(screen.getByRole('button', { name: /Windows/ }));
    expect(screen.getByText(/-JoinCode JOIN-42 -Url/)).toBeInTheDocument();
    expect(screen.getByText('In PowerShell. No admin rights needed.')).toBeInTheDocument();
    await user.hover(screen.getByRole('button', { name: 'Install details' }));

    expect(await findText('Install on Windows')).toBeInTheDocument();
    for (const text of [
      'For your user. Starts at each sign-in.',
      'PowerShell as administrator',
      'Service ScyllaAgent. Starts with the machine.',
      'Need Git for Windows.',
      'Works once. A new code stops the old one.',
      'Add one agent per machine.',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('runs a Docker agent with the image of the server, and warns before it gives the socket', async () => {
    const { apps } = setUp();
    const user = await createAgent(apps);
    await screen.findByText(/-- JOIN-42 --url/);

    await user.click(screen.getByRole('button', { name: /Docker/ }));

    expect(await screen.findByText(new RegExp(`${IMAGE}$`))).toBeInTheDocument();
    expect(screen.getByText('Runs shell steps. No container steps.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Container runtime')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Run container steps (Linux only)' }));

    expect(screen.getByText(/--group-add/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/control the Docker of this machine/);
    expect(screen.getByText('Runs shell steps and container steps.')).toBeInTheDocument();
  });

  it('installs by hand with a real link to the binary of the version', async () => {
    const { apps } = setUp();
    const user = await createAgent(apps);
    await screen.findByText(/-- JOIN-42 --url/);

    await user.click(screen.getByRole('button', { name: /Install by hand/ }));

    expect(screen.getByText(/scylla-agent join http/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Open the release' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/releases\/tag\/v0\.7\.0$/),
    );
  });

  it('gives the command of the logs after one minute with no connection', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const { apps } = setUp({ pathname: '/acme/agents/a1/connect' });
    render(NewAgentPage, { appId: 'a1' });
    await screen.findByText(/-- JOIN-77 --url/);

    expect(screen.queryByText(/No connection after one minute/)).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(61_000);

    expect(await screen.findByText(/No connection after one minute/)).toBeInTheDocument();
    expect(screen.getByText('journalctl -u scylla-agent -f')).toBeInTheDocument();
    expect(apps.createJoinCode).toHaveBeenCalledTimes(1);
  });
});

const findText = async (text: string) => {
  await waitFor(() => expect(screen.getByText(text)).toBeInTheDocument());
  return screen.getByText(text);
};
