import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { setAppNavigator, contextStore } from '@platform/context';
import { holdsLeave } from '@scylla/core-sdk';
import { installTestNavigator } from '@test/navigator.ts';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type {
  DashboardChange,
  DashboardDraft,
  DashboardLayoutRepository,
  StoredDashboard,
} from '@base/features/dashboard/domain/repository/dashboard-layout.repository.ts';
import { LocalDashboardPreferences } from '@base/features/dashboard/infrastructure/local-dashboard-preferences.ts';
import { dashboardEditor } from '@base/features/dashboard/presentation/ui/dashboard-editor.state.svelte.ts';
import { dashboardView } from '@base/features/dashboard/presentation/ui/dashboard-view.state.svelte.ts';
import DashboardPage from './Dashboard.page.svelte';
import DashboardWithPanel from './__test__/DashboardWithPanel.fixture.svelte';

Element.prototype.getAnimations ??= () => [];

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
let server: MemoryDashboards;
let listAttention: ReturnType<typeof vi.fn>;

const attentionItem = (overrides: Record<string, unknown> = {}) => ({
  kind: 'job-failed',
  at: '2026-01-01T00:05:00.000Z',
  isNew: true,
  count: 1,
  projectId: 'project-1',
  projectName: 'Acme project',
  pipelineId: 'pipeline-1',
  pipelineName: 'deploy-web',
  job: { id: 'job-0000failed', error: 'push-image: denied', branch: 'main', agentName: '', nodeId: 'push', nodeError: '' },
  ...overrides,
});

/** DashboardService in memory: a stale version gives `ABORTED`, as the server does. */
class MemoryDashboards implements DashboardLayoutRepository {
  dashboards: StoredDashboard[] = [];

  list() {
    return Promise.resolve(this.dashboards.map(dashboard => ({ ...dashboard })));
  }

  create(_workspaceId: string, draft: DashboardDraft) {
    const dashboard = { id: `dashboard-${this.dashboards.length + 1}`, version: 1, teamDefault: false, ...draft };
    this.dashboards.push(dashboard);
    return Promise.resolve({ ...dashboard });
  }

  update(change: DashboardChange) {
    const index = this.dashboards.findIndex(dashboard => dashboard.id === change.id);
    const current = this.dashboards[index];
    if (!current) return Promise.reject(new ScyllaError('gone', { code: 'NOT_FOUND' }));
    if (current.version !== change.version) return Promise.reject(new ScyllaError('changed', { code: 'ABORTED' }));
    const { id: _id, version: _version, ...fields } = change;
    const next = { ...current, ...fields, version: current.version + 1 };
    this.dashboards[index] = next;
    return Promise.resolve({ ...next });
  }

  remove(id: string) {
    this.dashboards = this.dashboards.filter(dashboard => dashboard.id !== id);
    return Promise.resolve();
  }

  setTeamDefault(_workspaceId: string, id: string) {
    this.dashboards = this.dashboards.map(dashboard => ({ ...dashboard, teamDefault: dashboard.id === id }));
    return Promise.resolve({ ...this.dashboards.find(dashboard => dashboard.id === id)! });
  }
}
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
    removeItem: (key: string) => void stored.delete(key),
  };
  server = new MemoryDashboards();
  listAttention = vi.fn().mockResolvedValue({
    items: [attentionItem()],
    openCount: 1,
    newCount: 1,
    counts: [{ kind: 'job-failed', open: 1 }],
  });

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    dashboard: {
      dashboardLayoutRepository: server,
      dashboardPreferences: new LocalDashboardPreferences(() => storage),
      attentionRepository: { list: listAttention },
    },
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
    expect(within(widget).getByText('14 days')).toBeInTheDocument();
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

describe('Needs you', () => {
  it('shows each kind of open item of the server, with the open and new counts', async () => {
    listAttention.mockResolvedValue({
      items: [
        attentionItem(),
        attentionItem({
          kind: 'fire-missed',
          isNew: false,
          count: 3,
          pipelineName: 'nightly-backup',
          job: undefined,
          fire: { id: 'fire-1', triggerId: 'trigger-1', triggerName: 'nightly', schedule: '0 2 * * *', error: '' },
        }),
        attentionItem({
          kind: 'agent-offline',
          projectId: '',
          projectName: '',
          pipelineId: '',
          pipelineName: '',
          job: undefined,
          agent: { id: 'agent-1', name: 'runner-us-1', lastSeenAt: '2026-01-01T00:00:00.000Z' },
        }),
      ],
      openCount: 5,
      newCount: 1,
      counts: [],
    });
    render(DashboardPage);

    const widget = await screen.findByRole('region', { name: 'Needs you' });
    expect((await within(widget).findAllByText('1 new')).length).toBeGreaterThan(0);
    expect(within(widget).getByText('5')).toBeInTheDocument();
    expect(within(widget).getByText('push-image: denied')).toBeInTheDocument();
    expect(within(widget).getByText('nightly-backup')).toBeInTheDocument();
    expect(within(widget).getByText('time missed')).toBeInTheDocument();
    expect(within(widget).getByText('The trigger nightly made no job.')).toBeInTheDocument();
    expect(within(widget).getByText('runner-us-1')).toBeInTheDocument();
    expect(within(widget).getByText('The agent is not connected.')).toBeInTheDocument();
    expect(screen.getByText('5 things')).toBeInTheDocument();
  });

  it('asks the items of the scope, since the last visit', async () => {
    stored.set('dashboards-visit:org-1', '2026-01-01T00:00:00.000Z');
    dashboardView.setProject('project-1');
    render(DashboardPage);

    await vi.waitFor(() =>
      expect(listAttention).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: 'org-1', projectIds: ['project-1'] }),
      ),
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
  const storedSet = () => ({ dashboards: server.dashboards });
  const firstWidgets = () => server.dashboards[0]?.widgets.length;

  it('removes a widget in a draft, and stores the layout on Save layout', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    await user.click(await panel().findByRole('button', { name: 'Edit dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Remove Success rate' }));

    expect(screen.queryByRole('region', { name: 'Success rate' })).not.toBeInTheDocument();
    expect(screen.getByText('1 change · not saved')).toBeInTheDocument();
    expect(firstWidgets()).toBe(12);

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
    expect(firstWidgets()).toBe(12);
  });

  it('changes the size of the selected widget from its toolbar', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    await user.click(await panel().findByRole('button', { name: 'Edit dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Run duration', pressed: false }));
    const durationSizes = screen.getByRole('radiogroup', { name: 'Size of Run duration' });
    expect(within(durationSizes).getByRole('radio', { name: 'L' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Success rate', pressed: false }));
    const sizes = screen.getByRole('radiogroup', { name: 'Size of Success rate' });
    expect(within(sizes).getByRole('radio', { name: 'L' })).toBeEnabled();
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

  it('asks before it leaves a layout with unsaved changes: Stay keeps the draft', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    await user.click(await panel().findByRole('button', { name: 'Edit dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Remove Success rate' }));
    const go = vi.fn();
    expect(holdsLeave(go)).toBe(true);

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Leave with unsaved changes?')).toBeInTheDocument();
    expect(go).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Stay' }));
    await vi.waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(panel().getByText('1 change · not saved')).toBeInTheDocument();

    expect(holdsLeave(go)).toBe(true);
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard and leave' }));
    expect(go).toHaveBeenCalledOnce();
    expect(firstWidgets()).toBe(12);
    expect(holdsLeave(vi.fn())).toBe(false);
  });

  it('keeps the selection on a press in the toolbar, and drops it on a press on the background', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    await user.click(await panel().findByRole('button', { name: 'Edit dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Success rate', pressed: false }));
    const sizes = screen.getByRole('radiogroup', { name: 'Size of Success rate' });
    await user.click(within(sizes).getByRole('radio', { name: 'M' }));
    expect(screen.getByRole('radiogroup', { name: 'Size of Success rate' })).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole('radiogroup', { name: 'Size of Success rate' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Success rate', pressed: false })).toBeInTheDocument();
  });

  it('imports the layouts of an older build once, when the server has none', async () => {
    stored.set(
      'dashboards:org-1',
      JSON.stringify({ defaultId: 'b', dashboards: [{ id: 'b', name: 'Release day', widgets: [{ id: 'w1', data: 'pipelines', size: 'l' }] }] }),
    );
    render(DashboardWithPanel);

    await vi.waitFor(() => expect(server.dashboards.map(item => item.name)).toEqual(['Release day']));
    expect(stored.has('dashboards:org-1')).toBe(false);
    expect(stored.get('dashboards-default:org-1')).toBe(server.dashboards[0].id);
  });

  it('reads the dashboards again on a conflict of version, and writes over nothing', async () => {
    const user = userEvent.setup();
    render(DashboardWithPanel);

    await user.click(await panel().findByRole('button', { name: 'Edit dashboard' }));
    await vi.waitFor(() => expect(server.dashboards).toHaveLength(1));
    server.dashboards[0] = { ...server.dashboards[0], version: 7, name: 'Changed elsewhere' };
    await user.click(screen.getByRole('button', { name: 'Remove Success rate' }));
    await user.click(panel().getByRole('button', { name: 'Save layout' }));

    await vi.waitFor(() => expect(panel().getByText('Changed elsewhere')).toBeInTheDocument());
    expect(server.dashboards[0].widgets).toHaveLength(12);
    expect(server.dashboards[0].version).toBe(7);
  });
});
