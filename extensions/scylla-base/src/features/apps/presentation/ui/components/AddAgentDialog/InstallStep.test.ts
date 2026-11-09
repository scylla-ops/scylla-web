import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import InstallStep from './InstallStep.svelte';

const IMAGE = 'ghcr.io/scylla-ops/scylla-agent:0.7.0';

let teardown: Array<() => void> = [];

const setUp = (joined = false) => {
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      apps: {
        appsRepository: {
          getServerInfo: vi.fn().mockResolvedValue({ version: '0.7.0', agentImage: IMAGE }),
        },
      },
    }),
  ];
  render(InstallStep, {
    joinCode: { code: 'JOIN-42', expiresAt: new Date(Date.now() + 900_000).toISOString() },
    onNewCode: vi.fn(),
    renewing: false,
    joined,
  });
};

afterEach(() => {
  teardown.forEach(restore => restore());
  vi.useRealTimers();
});

describe('InstallStep', () => {
  it('starts on Linux and gives each tab its command and its hint', async () => {
    setUp();
    const user = userEvent.setup();

    expect(screen.getByRole('tab', { name: 'Linux', selected: true })).toBeInTheDocument();
    expect(screen.getByText(/install\.sh \| sh -s -- JOIN-42 --url/)).toBeInTheDocument();
    expect(screen.getByText(/asks for your sudo password/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'macOS' }));
    expect(screen.getByText(/install\.sh \| sh -s -- JOIN-42 --url/)).toBeInTheDocument();
    expect(screen.getByText(/needs no sudo/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Windows' }));
    expect(screen.getByText(/-JoinCode JOIN-42 -Url/)).toBeInTheDocument();
    expect(screen.getByText(/needs Git for Windows/)).toBeInTheDocument();
  });

  it('keeps the OS tabs in a flex row: in a grid row, a tab is taller than the list and touches its bottom', () => {
    setUp();
    const tabs = screen.getByRole('tablist');

    expect(tabs).toHaveClass('w-full');
    expect(tabs).not.toHaveClass('grid');
  });

  it('runs a Docker agent with the image of the server, and reaches a local server', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(screen.getByRole('tab', { name: 'Docker' }));

    expect(await screen.findByText(new RegExp(`${IMAGE}$`))).toBeInTheDocument();
    expect(screen.getByText(/--restart unless-stopped/)).toBeInTheDocument();
    expect(screen.getByText(/SCYLLA_URL=http:\/\/host\.docker\.internal/)).toBeInTheDocument();
    expect(screen.getByText(/does not run container steps/)).toBeInTheDocument();
    expect(
      screen.getByText(/replace host\.docker\.internal with 127\.0\.0\.1/),
    ).toBeInTheDocument();
  });

  it('warns before it gives a Docker agent the socket of the machine', async () => {
    setUp();
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Docker' }));

    await user.click(screen.getByRole('checkbox', { name: 'Run container steps (Linux only)' }));

    expect(screen.getByText(/--group-add/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/control the Docker of this machine/);
    expect(screen.queryByText(/does not run container steps/)).not.toBeInTheDocument();
  });

  it('has no runtime choice for Docker, and a real link to the binary of the version', async () => {
    setUp();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Other ways and options/ }));

    expect(screen.getByLabelText('Container runtime')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Open the release' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/releases\/tag\/v0\.7\.0$/),
    );
    expect(screen.getByRole('link', { name: 'Build from source' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Docker' }));
    expect(screen.queryByLabelText('Container runtime')).not.toBeInTheDocument();
  });

  it('tells that the machine joined while the agent does not connect', () => {
    setUp(true);

    expect(screen.getByText('The machine joined. Waiting for its connection.')).toBeInTheDocument();
    expect(screen.queryByText('Waiting for the agent…')).not.toBeInTheDocument();
  });

  it('gives the command of the logs after one minute with no connection', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    setUp();

    expect(screen.queryByText(/No connection after one minute/)).not.toBeInTheDocument();

    vi.advanceTimersByTime(61_000);
    flushSync();

    expect(screen.getByText(/No connection after one minute/)).toBeInTheDocument();
    expect(screen.getByText('journalctl -u scylla-agent -f')).toBeInTheDocument();
  });
});
