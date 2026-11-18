import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { setAppNavigator, contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import { LocalDashboardLayoutRepository } from '@base/features/dashboard/infrastructure/local-dashboard-layout.repository.ts';
import { dashboardEditor } from '@base/features/dashboard/presentation/ui/dashboard-editor.state.svelte.ts';
import { dashboardView } from '@base/features/dashboard/presentation/ui/dashboard-view.state.svelte.ts';
import DashboardPage from './Dashboard.page.svelte';
import DashboardWithPanel from './__test__/DashboardWithPanel.fixture.svelte';

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
let getProjects: ReturnType<typeof vi.fn>;
let stored: Map<string, string>;
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

  getProjects = vi.fn().mockResolvedValue({ items: [{ id: 'project-1', workspaceId: 'org-1', name: 'Acme project' }] });

  stored = new Map();
  const storage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
  };

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    dashboard: { dashboardLayoutRepository: new LocalDashboardLayoutRepository(() => storage) },
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
    project: { projectRepository: { getByWorkspaceId: getProjects } },
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
  dashboardView.setProject(null);
  dashboardEditor.stop();
  dashboardView.closeAdd();
  dashboardView.setCreating(false);
});

describe('DashboardPage', () => {
  it('has no page header: the widgets start at the top', async () => {
    render(DashboardPage);

    expect(await screen.findByRole('region', { name: 'Success rate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toHaveClass('sr-only');
  });

  it('shows the success rate of the period with its parts', async () => {
    render(DashboardPage);

    const widget = await screen.findByRole('region', { name: 'Success rate' });
    expect(widget).toHaveAttribute('data-size', 's');
    expect(widget.closest('[data-slot="widget-grid"]')).not.toBeNull();
    expect(await within(widget).findByText('89%')).toBeInTheDocument();
    expect(within(widget).getByText('14 d')).toBeInTheDocument();
  });

  it('counts what needs the user in the sentence', async () => {
    render(DashboardPage);

    expect(await screen.findByText('1 thing')).toBeInTheDocument();
    expect(screen.getByText('needs you.', { exact: false })).toBeInTheDocument();
  });

  it('lists a red pipeline in Needs you and in Pipelines', async () => {
    render(DashboardPage);

    const needsYou = await screen.findByRole('region', { name: 'Needs you' });
    expect(await within(needsYou).findByText('deploy-web')).toBeInTheDocument();

    const pipelines = screen.getByRole('region', { name: 'Pipelines' });
    expect(await within(pipelines).findByText('0 of 1 green')).toBeInTheDocument();
  });

  it('asks the live jobs with no period, and the job ends of the period', async () => {
    render(DashboardPage);

    await vi.waitFor(() => expect(getNewest.mock.calls.length).toBeGreaterThanOrEqual(3));
    expect(getNewest).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['running', 'pending', 'awaiting_approval'] }),
    );
    expect(getNewest).not.toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['running', 'pending', 'awaiting_approval'], createdAfter: expect.any(Date) }),
    );
    expect(getNewest).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses: ['completed', 'failed', 'cancelled', 'orphaned'],
        createdAfter: expect.any(Date),
      }),
    );
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

  it('asks the figures of one project when the scope is a project', async () => {
    dashboardView.setProject('project-1');
    render(DashboardPage);

    await vi.waitFor(() =>
      expect(getStats).toHaveBeenLastCalledWith(expect.objectContaining({ projectIds: ['project-1'] })),
    );
  });
});

describe('DashboardPanel', () => {
  const panel = () => within(document.querySelector('[data-slot="dashboard-panel"]') as HTMLElement);

  it('says which time zone the times use', async () => {
    render(DashboardWithPanel);

    expect(await screen.findByText('Times in Asia/Kolkata (UTC+5:30)')).toBeInTheDocument();
  });

  it('offers the period, the last 14 days first, and asks again for another period', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    expect(await panel().findByRole('radio', { name: '14 d' })).toHaveAttribute('aria-checked', 'true');
    await vi.waitFor(() => expect(getStats).toHaveBeenCalled());

    await user.click(panel().getByRole('radio', { name: '24 h' }));

    await vi.waitFor(() =>
      expect(getStats).toHaveBeenLastCalledWith(expect.objectContaining({ bucket: 'hour' })),
    );
    expect(navigate).toHaveBeenLastCalledWith('/?period=24h', { replace: true });
    expect(panel().getByRole('radio', { name: '24 h' })).toHaveAttribute('aria-checked', 'true');
  });

  it('lists the dashboard with its Default mark, and the scope', async () => {
    render(DashboardWithPanel);

    expect(await panel().findByText('Ops overview')).toBeInTheDocument();
    expect(panel().getByText('Default')).toBeInTheDocument();
    expect(panel().getByRole('combobox', { name: 'Scope' })).toHaveTextContent('All projects');
  });
});

describe('The edit mode', () => {
  const panel = () => within(document.querySelector('[data-slot="dashboard-panel"]') as HTMLElement);
  const storedSet = () => JSON.parse(stored.get('dashboards:org-1') ?? 'null') as {
    defaultId: string;
    dashboards: { id: string; name: string; widgets: { data: string; size: string }[] }[];
  } | null;

  it('removes a widget in a draft, and stores the layout on Save layout', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    await user.click(await panel().findByRole('button', { name: 'Edit dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Remove Success rate' }));

    expect(screen.queryByRole('region', { name: 'Success rate' })).not.toBeInTheDocument();
    expect(screen.getByText('1 change · not saved')).toBeInTheDocument();
    expect(storedSet()).toBeNull();

    await user.click(panel().getByRole('button', { name: 'Save layout' }));

    await vi.waitFor(() => expect(storedSet()?.dashboards[0].widgets).toHaveLength(11));
    expect(storedSet()?.dashboards[0].widgets.some(widget => widget.data === 'success-rate')).toBe(false);
    expect(panel().getByRole('button', { name: 'Edit dashboard' })).toBeInTheDocument();
  });

  it('drops the draft on Cancel, and Undo takes back one change', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    await user.click(await panel().findByRole('button', { name: 'Edit dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Remove Success rate' }));
    await user.click(panel().getByRole('button', { name: 'Undo the last change' }));
    expect(screen.getByRole('region', { name: 'Success rate' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Pipelines' }));
    await user.click(panel().getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('region', { name: 'Pipelines' })).toBeInTheDocument();
    expect(storedSet()).toBeNull();
  });

  it('changes the size of the selected widget from its toolbar', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    await user.click(await panel().findByRole('button', { name: 'Edit dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Success rate', pressed: false }));
    const sizes = screen.getByRole('radiogroup', { name: 'Size of Success rate' });
    expect(within(sizes).getByRole('radio', { name: 'L' })).toBeDisabled();
    await user.click(within(sizes).getByRole('radio', { name: 'XS' }));

    expect(screen.getByRole('region', { name: 'Success rate' })).toHaveAttribute('data-size', 'xs');
  });

  it('adds a widget of a kind from the palette', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    await user.click(await panel().findByRole('button', { name: 'Edit dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Remove Pipelines' }));
    await user.click(panel().getByRole('button', { name: 'Health' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Add widget' }));

    expect(await screen.findByRole('region', { name: 'Pipelines' })).toBeInTheDocument();
    expect(screen.getByText('2 changes · not saved')).toBeInTheDocument();
  });

  it('creates a dashboard from a template, and opens it in the edit mode', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    await user.click(await panel().findByRole('button', { name: 'New dashboard' }));
    await user.type(await screen.findByLabelText('Name'), 'Release day');
    await user.click(await findFloating('button', 'Create dashboard'));

    await vi.waitFor(() => expect(storedSet()?.dashboards.map(item => item.name)).toEqual(['Ops overview', 'Release day']));
    expect(storedSet()?.dashboards[1].widgets.map(widget => widget.data)).toEqual([
      'summary',
      'last-24-hours',
      'needs-you',
      'activity',
    ]);
    expect(panel().getByRole('button', { name: 'Save layout' })).toBeInTheDocument();
  });
});
