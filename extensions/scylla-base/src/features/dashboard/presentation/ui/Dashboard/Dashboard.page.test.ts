import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { setAppNavigator, contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import DashboardPage from './Dashboard.page.svelte';

const figures = (outcomes: { completed: number; failed: number; cancelled: number; orphaned: number }) => ({
  created: outcomes.completed + outcomes.failed + outcomes.cancelled + outcomes.orphaned,
  outcomes,
  p50Duration: 190,
  p95Duration: 525,
  p50Queue: null,
  p95Queue: null,
  runTime: 0,
});

const stats = () => ({
  totals: figures({ completed: 8, failed: 1, cancelled: 2, orphaned: 0 }),
  previous: figures({ completed: 3, failed: 1, cancelled: 0, orphaned: 0 }),
  buckets: [],
  groups: [],
  timeZone: 'Asia/Kolkata',
});

const summary = (overrides: Record<string, unknown> = {}) => ({
  id: 'pipeline-1',
  name: 'deploy-web',
  projectId: 'project-1',
  projectName: 'Acme project',
  recent: [{ id: 'job-0000failed', status: 'failed', branch: 'main', createdAt: '2026-01-01T00:00:00.000Z', finishedAt: '2026-01-01T00:05:00.000Z' }],
  completed: 0,
  failed: 1,
  medianDuration: 300,
  health: 'red',
  active: false,
  triggerKinds: ['push'],
  nextFire: null,
  ...overrides,
});

let getStats: ReturnType<typeof vi.fn>;
let getNewest: ReturnType<typeof vi.fn>;
let getSummaries: ReturnType<typeof vi.fn>;
let getWorkspaces: ReturnType<typeof vi.fn>;
let navigate: ReturnType<typeof installTestNavigator>['navigate'];
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

const grant = (permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });

beforeEach(() => {
  getStats = vi.fn().mockResolvedValue(stats());
  getNewest = vi.fn().mockResolvedValue([]);
  getSummaries = vi.fn().mockResolvedValue({ items: [summary()], total: 1, green: 0 });
  getWorkspaces = vi.fn().mockResolvedValue([
    { id: 'org-1', name: 'Acme', slug: 'acme', personalTokensEnabled: true, timeZone: 'Asia/Kolkata' },
  ]);

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    pipeline: {
      pipelineRepository: { getSummaries },
    },
    jobs: {
      jobsRepository: {
        getStats,
        getNewestByWorkspaceId: getNewest,
      },
    },
    workspace: { workspaceRepository: { getMine: getWorkspaces } },
  });

  navigate = installTestNavigator().navigate;
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: null },
    project: { id: null, name: null },
  });
  grant([
    Permission.LIST_PIPELINES_BY_WORKSPACE,
    Permission.LIST_JOBS_BY_WORKSPACE,
  ]);
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  setAppNavigator(null);
  permissionsStore.setState({ permissions: null });
});

describe('DashboardPage', () => {
  it('says in the header which time zone the times use', async () => {
    render(DashboardPage);

    expect(await screen.findByText('Times in Asia/Kolkata (UTC+5:30)')).toBeInTheDocument();
  });

  it('offers the period of the dashboard in the header, the last 14 days first', async () => {
    const user = userEvent.setup();
    render(DashboardPage);

    expect(screen.getByRole('radio', { name: '14 d' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: '30 d' }));

    expect(screen.getByRole('radio', { name: '30 d' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the success rate of the period, with the cancelled jobs apart and the change', async () => {
    render(DashboardPage);

    const widget = await screen.findByRole('region', { name: 'Success rate' });
    expect(widget).toHaveAttribute('data-size', 'm');
    expect(widget.closest('[data-slot="widget-grid"]')).not.toBeNull();
    expect(await within(widget).findByRole('img', { name: 'Success rate 89%' })).toBeInTheDocument();
    expect(within(widget).getByText('2 cancelled, not counted')).toBeInTheDocument();
    expect(within(widget).getByText('+13.9 pts')).toBeInTheDocument();
  });

  it('asks the figures of the period, and asks again when the user picks another period', async () => {
    const user = userEvent.setup();
    render(DashboardPage);

    await vi.waitFor(() => expect(getStats).toHaveBeenCalled());
    expect(getStats).toHaveBeenLastCalledWith(
      expect.objectContaining({ workspaceId: 'org-1', bucket: 'day', to: null, compare: true }),
    );
    const firstFrom = (getStats.mock.lastCall![0] as { from: Date }).from;

    await user.click(screen.getByRole('radio', { name: '24 h' }));

    await vi.waitFor(() =>
      expect(getStats).toHaveBeenLastCalledWith(expect.objectContaining({ bucket: 'hour' })),
    );
    expect((getStats.mock.lastCall![0] as { from: Date }).from).not.toEqual(firstFrom);
    expect(navigate).toHaveBeenLastCalledWith('/?period=24h', { replace: true });
  });

  it('gives the period to the activity, and no period to the jobs that run now', async () => {
    render(DashboardPage);

    await vi.waitFor(() => expect(getNewest.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(getNewest).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['running', 'pending', 'awaiting_approval'] }),
    );
    expect(getNewest).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses: ['completed', 'failed', 'cancelled', 'orphaned'],
        createdAfter: expect.any(Date),
      }),
    );
    expect(getNewest).not.toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['running', 'pending', 'awaiting_approval'], createdAfter: expect.any(Date) }),
    );
  });

  it('lists a red pipeline in Needs you and in Pipelines', async () => {
    render(DashboardPage);

    const needsYou = await screen.findByRole('region', { name: 'Needs you' });
    expect(await within(needsYou).findByText('deploy-web')).toBeInTheDocument();
    expect(within(needsYou).getByText('0000failed'.slice(-8))).toBeInTheDocument();

    const pipelines = screen.getByRole('region', { name: 'Pipelines' });
    expect(await within(pipelines).findByText('0 of 1 green')).toBeInTheDocument();
  });

  it('locks the widgets of the jobs for a user who cannot read them', async () => {
    grant([Permission.LIST_PIPELINES_BY_WORKSPACE]);
    render(DashboardPage);

    const widget = await screen.findByRole('region', { name: 'Success rate' });
    expect(within(widget).getByText('You do not have the permission to read this data.')).toBeInTheDocument();
    expect(getStats).not.toHaveBeenCalled();
  });

  it('asks for no figure, no pipeline and no run for a reader of the workspace', async () => {
    grant([]);
    render(DashboardPage);

    expect(await screen.findByRole('region', { name: 'Success rate' })).toBeInTheDocument();
    expect(getStats).not.toHaveBeenCalled();
    expect(getSummaries).not.toHaveBeenCalled();
    expect(getNewest).not.toHaveBeenCalled();
  });
});
