import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { selectionStore } from '@scylla/ui/stores';
import { installTestNavigator } from '@test/navigator.ts';
import { getQueryClient } from '@scylla/core-sdk';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import DashboardPipelinePage from './DashboardPipeline.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

const pipelines = [
  { id: 'pipeline-1', projectId: 'project-1', name: 'nightly', nodeCount: 2, createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z' },
  { id: 'pipeline-2', projectId: 'project-1', name: 'release', nodeCount: 1, createdAt: '2026-09-02T10:00:00Z', updatedAt: '2026-09-02T10:00:00Z' },
];

const job = {
  id: 'job-7',
  pipelineId: 'pipeline-1',
  status: 'success',
  nodeExecutions: [],
  createdAt: '2026-09-03T10:00:00Z',
  updatedAt: '2026-09-03T10:05:00Z',
  startedAt: '2026-09-03T10:00:00Z',
  finishedAt: '2026-09-03T10:05:00Z',
};

const page = (items: typeof pipelines) => ({
  items,
  pagination: { totalCount: items.length, page: 1, pageSize: 10, totalPages: 1, hasNext: false, hasPrevious: false },
});

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;
let run: ReturnType<typeof vi.fn>;

const grantEverything = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });

const setUp = (getMetadataByProjectId: () => Promise<unknown>) => {
  run = vi.fn().mockResolvedValue(undefined);
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      pipeline: { pipelineRepository: { getMetadataByProjectId, run } },
      jobs: {
        jobsRepository: {
          getByPipelineId: (pipelineId: string) =>
            Promise.resolve({ items: pipelineId === 'pipeline-1' ? [job] : [] }),
        },
      },
      apps: { appsRepository: { listApps: () => Promise.resolve([]) } },
    }),
  ];
  return render(DashboardPipelinePage, { projectId: 'project-1' });
};

beforeEach(() => {
  navigator = installTestNavigator({ pathname: '/acme/projects/project-1' });
  grantEverything();
  selectionStore.setState({ selectedIds: {} });
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: null },
    project: { id: 'project-1', name: 'web' },
  });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
});

describe('DashboardPipelinePage', () => {
  it('lists the pipelines of the project with their count', async () => {
    setUp(() => Promise.resolve(page(pipelines)));

    expect(await screen.findByText('nightly')).toBeInTheDocument();
    expect(screen.getByText('release')).toBeInTheDocument();
  });

  it('says so when the project has no pipeline', async () => {
    setUp(() => Promise.resolve(page([])));

    expect(await screen.findByText('No pipeline found')).toBeInTheDocument();
  });

  it('shows the error of the backend when the list fails', async () => {
    setUp(() => Promise.reject(new ScyllaError('backend is down')));

    expect(await screen.findByText('Error')).toBeInTheDocument();
    expect(screen.queryByText('nightly')).not.toBeInTheDocument();
  });

  it('calls the list once when it fails in a frame taller than the smallest page', async () => {
    const frame = vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(800);
    let calls = 0;
    // A loop stops at the 10th call: with no limit, it fills the memory of the worker.
    const list = () => {
      calls += 1;
      return calls < 10 ? Promise.reject(new ScyllaError('down')) : new Promise(() => {});
    };
    setUp(list);
    teardown.push(() => frame.mockRestore());

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(calls).toBe(1);
    expect(await screen.findByText('Error')).toBeInTheDocument();
  });

  describe('when the layout gives a height that changes the page size', () => {
    let height: PropertyDescriptor | undefined;

    beforeEach(() => {
      height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get: () => 900,
      });
    });

    afterEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', height ?? { value: 0 });
    });

    it('asks once and shows the error when the first load fails', async () => {
      const list = vi.fn(() => Promise.reject(new ScyllaError('backend is down')));
      setUp(list);

      expect(await screen.findByText('Error')).toBeInTheDocument();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(list).toHaveBeenCalledTimes(1);
    });

    it('keeps the rows when a refetch fails', async () => {
      const list = vi
        .fn<() => Promise<unknown>>()
        .mockResolvedValueOnce(page(pipelines))
        .mockRejectedValue(new ScyllaError('backend is down'));
      setUp(list);
      expect(await screen.findByText('nightly')).toBeInTheDocument();

      await getQueryClient().refetchQueries({ type: 'active' });
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(screen.getByText('nightly')).toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  it('opens the last run of a pipeline', async () => {
    setUp(() => Promise.resolve(page(pipelines)));

    await userEvent.click(await screen.findByRole('button', { name: 'Open the last run' }));

    expect(navigator.navigate).toHaveBeenCalledWith(
      '/acme/projects/project-1/pipelines/pipeline-1/jobs/job-7',
      undefined,
    );
  });

  it('runs a pipeline from its row', async () => {
    setUp(() => Promise.resolve(page(pipelines)));
    await screen.findByText('nightly');

    const [runNightly] = screen.getAllByRole('button', { name: 'Run' });
    await userEvent.click(runNightly);

    await waitFor(() => expect(run).toHaveBeenCalledWith('pipeline-1'));
  });

  it('opens the editor, the jobs and the triggers of a pipeline', async () => {
    setUp(() => Promise.resolve(page(pipelines)));
    await screen.findByText('nightly');

    await userEvent.click(screen.getAllByRole('button', { name: 'Edit pipeline' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'View Jobs' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Triggers' })[0]);

    expect(navigator.navigate).toHaveBeenCalledWith(
      '/acme/projects/project-1/edit/pipeline-1',
      undefined,
    );
    expect(navigator.navigate).toHaveBeenCalledWith(
      '/acme/projects/project-1/pipelines/pipeline-1/jobs',
      undefined,
    );
    expect(navigator.navigate).toHaveBeenCalledWith(
      '/acme/projects/project-1/pipelines/pipeline-1/triggers',
      undefined,
    );
  });

  it('offers no jobs page to a reader of the pipelines who may not list the jobs', async () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.PROJECT,
            scopeId: 'project-1',
            access: { kind: 'restricted', permissions: [Permission.LIST_PIPELINES_BY_PROJECT] },
          },
        ],
      },
    });
    setUp(() => Promise.resolve(page(pipelines)));
    await screen.findByText('nightly');

    expect(screen.queryByRole('button', { name: 'View Jobs' })).not.toBeInTheDocument();
  });

  it('opens the members and the secrets of the project from the header', async () => {
    setUp(() => Promise.resolve(page(pipelines)));
    await screen.findByText('nightly');

    await userEvent.click(screen.getByRole('button', { name: 'Members' }));
    await userEvent.click(screen.getByRole('button', { name: 'Secrets' }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/projects/project-1/members', {});
    expect(navigator.navigate).toHaveBeenCalledWith('/acme/projects/project-1/secrets', {});
  });

  it('selects a pipeline when the user clicks its row', async () => {
    setUp(() => Promise.resolve(page(pipelines)));

    await userEvent.click(await screen.findByText('release'));

    expect(selectionStore.getState().selectedIds.pipelines).toEqual(['pipeline-2']);
  });
});
