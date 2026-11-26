import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { PROJECT_SEARCHES_QUERY_KEY, type ProjectCardContext } from '@base/features/project';
import type {
  PipelineSummary,
  PipelineSummaryList,
} from '@base/features/pipeline/domain/structs/pipeline-summary.struct.ts';
import ProjectCardBadge from './ProjectCardBadge.svelte';
import ProjectCardFooter from './ProjectCardFooter.svelte';
import ProjectCardPipelines from './ProjectCardPipelines.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

const summary = (patch: Partial<PipelineSummary>): PipelineSummary => ({
  id: 'pipe-ci',
  name: 'CI',
  projectId: 'web',
  projectName: 'web',
  recent: [{ id: 'job-1', status: 'failed', branch: 'main', createdAt: new Date().toISOString() }],
  completed: 0,
  failed: 1,
  medianDuration: null,
  health: 'red',
  active: false,
  triggerKinds: [],
  nextFire: null,
  ...patch,
});

const context: ProjectCardContext = {
  workspaceId: 'org-1',
  projectId: 'web',
  projectName: 'web',
  batch: ['web', 'api'],
};

let teardown: Array<() => void> = [];
let getSummaries: ReturnType<typeof vi.fn>;
let run: ReturnType<typeof vi.fn>;
let queryClient: ReturnType<typeof withQueryClient>['queryClient'];

const setUp = (items: PipelineSummary[]) => {
  const list: PipelineSummaryList = { items, total: items.length, green: 0 };
  getSummaries = vi.fn().mockResolvedValue(list);
  run = vi.fn().mockResolvedValue({ needsContainer: false });
  const cache = withQueryClient();
  queryClient = cache.queryClient;
  const navigator = installTestNavigator({ pathname: '/acme/projects' });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      pipeline: { pipelineRepository: { getSummaries, run } },
      apps: { appsRepository: { listApps: () => Promise.resolve([]) } },
    }),
  ];
};

beforeEach(() => {
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: null, name: null },
    pipeline: { id: null, name: null },
  });
});

afterEach(() => teardown.forEach(restore => restore()));

describe('the pipelines of a project card', () => {
  it('reads the pipelines of the whole batch in one call, for the badge, the rows and the footer', async () => {
    setUp([
      summary({}),
      summary({ id: 'pipe-e2e', name: 'E2E', health: 'green', recent: [] }),
      summary({ id: 'pipe-api', projectId: 'api', name: 'API' }),
    ]);

    render(ProjectCardBadge, { props: { context } });
    render(ProjectCardPipelines, { props: { context } });
    render(ProjectCardFooter, { props: { context } });

    expect(await screen.findByText('1 failing')).toBeInTheDocument();
    expect(await screen.findByText('Last job now')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the jobs of CI' })).toHaveAttribute(
      'href',
      '/acme/projects/web/pipelines/pipe-ci/jobs',
    );
    expect(screen.getByRole('link', { name: 'Open the jobs of E2E' })).toBeInTheDocument();
    expect(screen.queryByText('API')).toBeNull();
    expect(getSummaries).toHaveBeenCalledTimes(1);
    expect(getSummaries).toHaveBeenCalledWith(
      expect.objectContaining({ projectIds: ['web', 'api'], allPages: true, runs: 1 }),
    );
  });

  it('runs a pipeline in one click, and reads the pipelines and the project counts again', async () => {
    setUp([summary({})]);
    const search = [...PROJECT_SEARCHES_QUERY_KEY('org-1'), { query: '' }];
    queryClient.setQueryData(search, { items: [], counts: null, hasMore: false });
    render(ProjectCardPipelines, { props: { context } });

    await userEvent.click(await screen.findByRole('button', { name: 'Run the pipeline' }));

    expect(run).toHaveBeenCalledWith('pipe-ci', undefined);
    await waitFor(() => expect(getSummaries).toHaveBeenCalledTimes(2));
    expect(queryClient.getQueryState(search)?.isInvalidated).toBe(true);
  });

  it('opens the jobs of a pipeline in its project', async () => {
    setUp([summary({})]);
    render(ProjectCardPipelines, { props: { context } });

    const row = await screen.findByRole('link', { name: 'Open the jobs of CI' });
    row.addEventListener('click', event => event.preventDefault());
    await userEvent.click(row);

    expect(contextStore.getState().project).toEqual({ id: 'web', name: 'web' });
    expect(contextStore.getState().pipeline).toEqual({ id: 'pipe-ci', name: 'CI' });
  });

  it('links to the project for the pipelines after the third', async () => {
    setUp(['a', 'b', 'c', 'd', 'e'].map(id => summary({ id, name: id })));
    render(ProjectCardPipelines, { props: { context } });

    expect(await screen.findByRole('link', { name: '2 other pipelines' })).toHaveAttribute(
      'href',
      '/acme/projects/web',
    );
    expect(screen.getAllByRole('button', { name: 'Run the pipeline' })).toHaveLength(3);
  });

  it('offers to create the first pipeline of a project with none', async () => {
    setUp([]);
    render(ProjectCardPipelines, { props: { context } });
    render(ProjectCardFooter, { props: { context } });

    expect(await screen.findByText('No pipeline yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a pipeline' })).toBeInTheDocument();
    expect(document.querySelector('[data-part="project-last-job"]')).toBeNull();
  });

  it('shows no Run button to a reader who may not run the pipeline', async () => {
    permissionsStore.setState({ permissions: { scopes: [] } });
    setUp([summary({})]);
    render(ProjectCardPipelines, { props: { context } });

    expect(await screen.findByRole('link', { name: 'Open the jobs of CI' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run the pipeline' })).toBeNull();
  });
});
