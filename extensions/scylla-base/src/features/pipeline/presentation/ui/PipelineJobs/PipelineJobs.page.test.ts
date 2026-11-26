import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { loadJobsPage } from '@base/features/jobs';
import { installTestNavigator } from '@test/navigator.ts';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import PipelineJobsPage from './PipelineJobs.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

const link = {
  projectId: 'project-1',
  provider: 'gitlab',
  fullName: 'acme/api',
  defaultBranch: 'main',
  reportsEnabled: false,
};

const empty = {
  items: [],
  pagination: {
    totalCount: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  },
};

let teardown: Array<() => void> = [];
let getByPipelineId: ReturnType<typeof vi.fn>;
let run: ReturnType<typeof vi.fn>;

const setUp = (linked: unknown, search = '') => {
  getByPipelineId = vi.fn().mockResolvedValue(empty);
  run = vi.fn().mockResolvedValue({ needsContainer: false });
  const cache = withQueryClient();
  const navigator = installTestNavigator({
    pathname: '/acme/projects/project-1/pipelines/pipeline-1/jobs',
    search,
  });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      jobs: { jobsRepository: { getByPipelineId } },
      pipeline: {
        pipelineRepository: {
          run,
          getWithLayout: () => new Promise(() => {}),
        },
      },
      integrations: {
        repositoryLinkRepository: {
          getByProject: () => Promise.resolve(linked),
          listRefs: () =>
            Promise.resolve({
              refs: [
                { name: 'main', kind: 'branch', sha: 'a1b2c3d4', defaultBranch: true, webUrl: '' },
                {
                  name: 'feature/login',
                  kind: 'branch',
                  sha: 'b2c3d4e5',
                  defaultBranch: false,
                  webUrl: '',
                },
              ],
              nextPageToken: '',
            }),
        },
      },
      apps: { appsRepository: { listApps: () => Promise.resolve([]) } },
    }),
  ];
  render(PipelineJobsPage, { projectId: 'project-1', pipelineId: 'pipeline-1' });
};

beforeAll(async () => {
  // The page of `jobs` is a loader: load it once, before a `findBy*` waits for it.
  await loadJobsPage();
});

beforeEach(() => {
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: 'project-1', name: 'api' },
    pipeline: { id: 'pipeline-1', name: 'build' },
  });
});

afterEach(() => teardown.forEach(restore => restore()));

const lastFilter = () => getByPipelineId.mock.calls.at(-1)?.[2];

const emptyState = async () =>
  (await screen.findByText('No jobs found')).closest<HTMLElement>('[data-slot="empty-state"]')!;
/** The Run of the header: the empty list has its own. */
const headerRun = () => document.querySelector<HTMLElement>('[data-part="feature-header-new"]')!;

describe('PipelineJobsPage', () => {
  it('offers no filter when the project has no linked repository: its jobs have no commit', async () => {
    setUp(null);

    await screen.findByText('No jobs found');

    expect(screen.queryByRole('group', { name: 'Filter the jobs' })).not.toBeInTheDocument();
    expect(lastFilter()).toBeUndefined();
  });

  it('filters the jobs on the event, the author and the pull request, and clears the filters', async () => {
    setUp(link);
    await screen.findByRole('group', { name: 'Filter the jobs' });

    await userEvent.click(screen.getByRole('combobox', { name: 'Event' }));
    await userEvent.click(await findFloating('option', 'Pull request'));
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Author login' }),
      'lea-martin{Enter}',
    );
    await userEvent.type(screen.getByRole('spinbutton', { name: 'PR number' }), '51{Enter}');

    await waitFor(() =>
      expect(lastFilter()).toEqual({
        event: 'pull_request',
        authorLogin: 'lea-martin',
        pullRequest: 51,
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => expect(lastFilter()).toEqual({}));
    expect(screen.getByRole('textbox', { name: 'Author login' })).toHaveValue('');
  });

  it('opens with the filters of the link, so that a copied link shows the same jobs', async () => {
    setUp(link, '?event=pull_request&author=lea-martin&pr=51');
    await screen.findByRole('group', { name: 'Filter the jobs' });

    await waitFor(() =>
      expect(lastFilter()).toEqual({
        event: 'pull_request',
        authorLogin: 'lea-martin',
        pullRequest: 51,
      }),
    );
    expect(screen.getByRole('textbox', { name: 'Author login' })).toHaveValue('lea-martin');
    expect(screen.getByRole('spinbutton', { name: 'PR number' })).toHaveValue(51);
  });

  it('asks which commit to run, and says that the reports of the repository are off', async () => {
    setUp(link);
    await screen.findByRole('group', { name: 'Filter the jobs' });

    await userEvent.click(headerRun());

    const dialog = await screen.findByRole('dialog', { name: 'Run build' });
    expect(dialog).toHaveTextContent(
      'The reports of this repository are off: the provider gets no result.',
    );
  });

  it('offers Run in the empty list of a pipeline with no job, for this pipeline', async () => {
    setUp(link);

    await userEvent.click(within(await emptyState()).getByRole('button', { name: 'Run' }));

    expect(await screen.findByRole('dialog', { name: 'Run build' })).toBeInTheDocument();
  });

  it('shows no Run in the empty list when a filter matches no job', async () => {
    setUp(link, '?event=pull_request');

    expect(within(await emptyState()).queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows no Run in the empty list to a person who may not run the pipeline', async () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.PROJECT,
            scopeId: 'project-1',
            access: { kind: 'restricted', permissions: [Permission.LIST_JOBS_BY_PIPELINE] },
          },
        ],
      },
    });
    setUp(null);

    expect(within(await emptyState()).queryByRole('button')).not.toBeInTheDocument();
  });
});
