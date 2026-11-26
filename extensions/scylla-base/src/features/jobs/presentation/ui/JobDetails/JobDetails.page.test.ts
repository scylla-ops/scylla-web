import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { CustomIcon } from '@shared/domain/structs/custom-icon.struct.ts';
import type { JobEntity, JobLog } from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobsRepository } from '@base/features/jobs/domain/repository/jobs.repository.ts';
import JobDetailsPage from './JobDetails.page.svelte';

/** The viewer (CodeMirror) reduced to what this page decides: which node, live, full screen. */
vi.mock('../jobs-log/JobLogViewer/JobLogViewer.svelte', async () => ({
  default: (await import('./JobLogViewer.stub.svelte')).default,
}));

/** jsdom lays nothing out: an observer a test can report a width through. */
class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  callback: (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(
    callback: (entries: Array<{ contentRect: { width: number; height: number } }>) => void,
  ) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }
}

const giveThePageWidth = (width: number) => {
  ResizeObserverMock.instances.forEach(observer =>
    observer.callback([{ contentRect: { width, height: 800 } }]),
  );
  flushSync();
};

const PATHNAME = '/acme/projects/p1/pipelines/pipeline-1/jobs/job-1';

const job = (overrides: Partial<JobEntity> = {}): JobEntity => ({
  id: 'job-1',
  pipelineId: 'pipeline-1',
  status: 'completed',
  nodes: [],
  nodeExecutions: [
    { id: 'build', state: 'completed', attempts: 1, maxAttempts: 1, ports: [] },
    { id: 'test', state: 'failed', attempts: 3, maxAttempts: 3, ports: [] },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:01:00.000Z',
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:00:45.000Z',
  ...overrides,
});

const logLine = (line: string, nodeId: string): JobLog => ({
  id: line,
  jobId: 'job-1',
  nodeId,
  stream: 'stdout',
  line,
  timestamp: '2026-01-01T00:00:00.000Z',
});

/** The agent of the job, as the apps give it, with the icon that an admin chose. */
const agentDetails = (icon?: CustomIcon) => ({
  app: { id: 'agent-1', name: 'pc-windows', runner: true, labels: [], icon },
  keys: [],
});
/** The avatar of the agent in a part of the page. */
const agentAvatar = (scope: HTMLElement) => scope.querySelector('[data-kind="agent"]');

/** The node of the log that the page shows. */
const shownNode = () => screen.queryByTestId('job-log-node')?.textContent?.trim();
const nodeList = () => screen.getByRole('navigation', { name: 'Node executions' });
const nodeRow = (name: RegExp) => within(nodeList()).getByRole('button', { name });
const lastUrl = () => navigator.navigate.mock.calls.at(-1)?.[0];
/** The facts of a group of the details: each label with its value. */
const factsOf = (group: HTMLElement) =>
  within(group)
    .getAllByRole('term')
    .map(term => [term.textContent?.trim(), term.nextElementSibling?.textContent?.trim()]);

let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: (() => void) | null = null;
let navigator: ReturnType<typeof installTestNavigator>;
let rerun: ReturnType<typeof vi.fn>;
let tailLogs: ReturnType<typeof vi.fn>;

const grantAll = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });

const renderPage = async (
  result: unknown,
  search = '',
  logs: JobLog[] = [],
  agent?: ReturnType<typeof agentDetails>,
) => {
  rerun = vi.fn().mockResolvedValue('job-2');
  tailLogs = vi.fn(() => ({
    // eslint-disable-next-line @typescript-eslint/require-await
    logs: (async function* () {
      for (const log of logs) yield log;
    })(),
    cancel: vi.fn(),
  }));
  restoreRegistry = withRegistry({
    jobs: {
      jobsRepository: {
        getById: vi.fn().mockResolvedValue(result),
        rerun,
        tailLogs,
      } as unknown as JobsRepository,
    },
    ...(agent && { apps: { appsRepository: { getApp: vi.fn().mockResolvedValue(agent) } } }),
  });
  navigator = installTestNavigator({ pathname: PATHNAME, search });

  const rendered = render(JobDetailsPage, { jobId: 'job-1' });
  await screen.findByRole('heading', { name: 'Job' });
  return rendered;
};

beforeEach(() => {
  ResizeObserverMock.instances = [];
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  localStorage.clear();
  cache = withQueryClient();
  grantAll();
});

afterEach(() => {
  cache.restore();
  restoreRegistry?.();
  restoreRegistry = null;
  navigator?.restore();
  localStorage.clear();
  permissionsStore.setState({ permissions: null });
});

describe('JobDetailsPage', () => {
  it('shows the job status and id', async () => {
    await renderPage(job());

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('job-1')).toBeInTheDocument();
  });

  it('shows the facts of the job on one line, and its details on demand', async () => {
    await renderPage(job({ agentId: 'agent-1' }));

    const facts = screen.getByRole('list', { name: 'Facts of the job' });
    expect(within(facts).getByText('Duration')).toHaveClass('sr-only');
    expect(within(facts).getByRole('link', { name: 'agent-1' })).toBeInTheDocument();

    const details = screen.getByRole('button', { name: 'Details' });
    expect(details).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('heading', { name: 'Run' })).not.toBeInTheDocument();

    await userEvent.click(details);

    expect(details).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(details.getAttribute('aria-controls') ?? '');
    expect(panel).toContainElement(screen.getByRole('heading', { name: 'Run' }));
    const run = within(panel!).getByRole('region', { name: 'Run' });
    expect(factsOf(run)).toEqual([
      ['Status', 'Success'],
      ['Duration', expect.any(String)],
      ['Created', expect.stringContaining('2026')],
      ['Started', expect.not.stringContaining('2026')],
      ['Finished', expect.not.stringContaining('2026')],
      ['Agent', 'agent-1'],
    ]);

    await userEvent.click(details);

    expect(details).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'Run' })).not.toBeInTheDocument();
  });

  it('shows in its details only the facts that a waiting job already has', async () => {
    await renderPage(job({ status: 'pending', startedAt: undefined, finishedAt: undefined }));

    await userEvent.click(screen.getByRole('button', { name: 'Details' }));

    expect(factsOf(screen.getByRole('region', { name: 'Run' })).map(([label]) => label)).toEqual([
      'Status',
      'Created',
    ]);
  });

  it('says that the log is live only while the job runs', async () => {
    await renderPage(job({ status: 'running', finishedAt: undefined }));
    expect(screen.getByTestId('job-log-viewer')).toHaveAttribute('data-live', 'true');
  });

  it('does not call the log of a finished job live', async () => {
    await renderPage(job());
    expect(screen.getByTestId('job-log-viewer')).toHaveAttribute('data-live', 'false');
  });

  it('says why the job failed, above the log', async () => {
    await renderPage(job({ status: 'failed', error: 'the node test failed: exit code 2' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The job failed');
    expect(alert).toHaveTextContent('the node test failed: exit code 2');
    expect(
      alert.compareDocumentPosition(screen.getByTestId('job-log-viewer')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows no reason for a job that did not fail', async () => {
    await renderPage(job());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says why a node did not run in place of its log', async () => {
    await renderPage(
      job({
        status: 'failed',
        nodeExecutions: [
          { id: 'deploy', state: 'skipped', attempts: 0, maxAttempts: 1, ports: [] },
        ],
      }),
      '?node=deploy',
    );

    expect(
      within(screen.getByTestId('job-log-viewer')).getByText(
        'It did not run, because another node of the job failed first.',
      ),
    ).toBeInTheDocument();
  });

  it('links to the agent of the job, by its id until its name arrives', async () => {
    await renderPage(job({ agentId: 'agent-1' }));

    expect(screen.getByRole('link', { name: 'agent-1' })).toHaveAttribute(
      'href',
      expect.stringContaining('/agents/agent-1'),
    );
  });

  it('shows the agent of the job with no link to a user who may not read the apps', async () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.SYSTEM,
            scopeId: '',
            access: { kind: 'restricted', permissions: [Permission.READ_JOB] },
          },
        ],
      },
    });

    await renderPage(job({ agentId: 'agent-1' }));

    expect(screen.getByText('agent-1')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'agent-1' })).not.toBeInTheDocument();
    expect(agentAvatar(document.body)?.querySelector('svg')).toHaveClass('lucide-bot');
  });

  it('shows the icon that an admin chose for the agent, in the facts and in the details', async () => {
    await renderPage(
      job({ agentId: 'agent-1' }),
      '',
      [],
      agentDetails({ kind: 'glyph', name: 'server', color: 'chart-3' }),
    );

    const facts = screen.getByRole('list', { name: 'Facts of the job' });
    await within(facts).findByRole('link', { name: 'pc-windows' });
    expect(agentAvatar(facts)?.querySelector('svg')).toHaveClass('lucide-server');

    await userEvent.click(screen.getByRole('button', { name: 'Details' }));

    const run = screen.getByRole('region', { name: 'Run' });
    expect(agentAvatar(run)?.querySelector('svg')).toHaveClass('lucide-server');
  });

  it('shows the image that an admin chose for the agent', async () => {
    await renderPage(
      job({ agentId: 'agent-1' }),
      '',
      [],
      agentDetails({ kind: 'image', imageId: 'img-1' }),
    );

    const facts = screen.getByRole('list', { name: 'Facts of the job' });
    await within(facts).findByRole('link', { name: 'pc-windows' });
    expect(agentAvatar(facts)?.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/images/img-1'),
    );
  });

  it('shows the default icon of an agent, not a server, for an agent with no icon', async () => {
    await renderPage(job({ agentId: 'agent-1' }), '', [], agentDetails());

    const facts = screen.getByRole('list', { name: 'Facts of the job' });
    await within(facts).findByRole('link', { name: 'pc-windows' });
    expect(agentAvatar(facts)?.querySelector('svg')).toHaveClass('lucide-bot');
    expect(facts.querySelector('.lucide-server')).not.toBeInTheDocument();
  });

  it('names the online agents that cannot get the code of a waiting job, with a link', async () => {
    await renderPage(
      job({
        status: 'pending',
        startedAt: undefined,
        finishedAt: undefined,
        waitingReason: 'NO_AGENT_WITH_CHECKOUT',
        unfitAgents: [
          { id: 'a-old', name: 'build-old', version: '0.7.0-rc.1', reason: 'update-agent' },
          { id: 'a-nogit', name: 'build-nogit', version: '0.7.0', reason: 'install-git' },
        ],
      }),
    );

    expect(
      screen.getByText('These online agents cannot get the code of this job'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'build-old' })).toHaveAttribute(
      'href',
      expect.stringContaining('/agents/a-old'),
    );
    expect(screen.getByText('Update the agent')).toBeInTheDocument();
    expect(screen.getByText('Install Git on its machine')).toBeInTheDocument();
  });

  it('shows the labels that a waiting job asks in its details, and why it waits', async () => {
    await renderPage(
      job({
        status: 'pending',
        startedAt: undefined,
        finishedAt: undefined,
        agentLabels: ['deploy', 'linux'],
        waitingReason: 'NO_AGENT_WITH_LABELS',
      }),
    );

    expect(
      screen.getByText('Waiting for an agent with the labels deploy, linux'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Details' }));

    const labels = screen.getByRole('list', { name: 'Labels' });
    expect(
      within(labels)
        .getAllByRole('listitem')
        .map(item => item.textContent?.trim()),
    ).toEqual(['deploy', 'linux']);
  });

  describe('the node of the log', () => {
    it('shows the whole job when the URL names no node', async () => {
      await renderPage(job());

      expect(shownNode()).toBe('whole job');
      expect(nodeRow(/Whole job/)).toHaveAttribute('aria-pressed', 'true');
    });

    it('opens the node that the URL names', async () => {
      await renderPage(job(), '?node=test');

      expect(shownNode()).toBe('test');
      expect(nodeRow(/test/)).toHaveAttribute('aria-pressed', 'true');
      expect(nodeRow(/Whole job/)).toHaveAttribute('aria-pressed', 'false');
    });

    it('opens the first node of an old link that named several', async () => {
      await renderPage(job(), '?nodes=test,build');

      expect(shownNode()).toBe('build');
    });

    it('shows the whole job for a node that the job does not have', async () => {
      await renderPage(job(), '?node=ghost');

      expect(shownNode()).toBe('whole job');
    });

    it('shows the log of the node picked in the list, and writes it in the URL', async () => {
      await renderPage(job());

      await userEvent.click(nodeRow(/build/));

      await waitFor(() => expect(shownNode()).toBe('build'));
      expect(lastUrl()).toBe(`${PATHNAME}?node=build`);
      expect(nodeRow(/build/)).toHaveAttribute('aria-pressed', 'true');
    });

    it('comes back to the whole job from its row', async () => {
      await renderPage(job(), '?node=build');

      await userEvent.click(nodeRow(/Whole job/));

      await waitFor(() => expect(shownNode()).toBe('whole job'));
      expect(lastUrl()).toBe(`${PATHNAME}?node=all`);
    });

    it('reads one stream for the whole job, whatever the node', async () => {
      await renderPage(job(), '?node=build');

      await userEvent.click(nodeRow(/test/));

      expect(tailLogs).toHaveBeenCalledTimes(1);
      expect(tailLogs).toHaveBeenCalledWith('job-1', undefined);
    });

    it('shows the number of errors of each node in the list', async () => {
      await renderPage(job(), '', [
        logLine('compile', 'build'),
        logLine('error: 2 tests failed', 'test'),
        logLine('FAILED tests::login', 'test'),
      ]);

      expect(await within(nodeRow(/test/)).findByText('2 errors')).toBeInTheDocument();
      expect(within(nodeRow(/Whole job/)).getByText('2 errors')).toBeInTheDocument();
      expect(within(nodeRow(/build/)).queryByText(/errors?$/)).not.toBeInTheDocument();
    });

    it('shows the attempt of a node that can retry in its row', async () => {
      await renderPage(job());

      expect(within(nodeRow(/test/)).getByText('Attempt 3/3')).toBeInTheDocument();
      expect(screen.queryByText(/Attempt \d+\/1/)).not.toBeInTheDocument();
    });

    it('shows a skipped node as skipped, with no attempt when it did not start', async () => {
      await renderPage(
        job({
          nodeExecutions: [
            { id: 'test', state: 'skipped', attempts: 0, maxAttempts: 3, ports: [] },
          ],
        }),
      );

      expect(within(nodeRow(/test/)).getByRole('img', { name: 'Skipped' })).toBeInTheDocument();
      expect(screen.queryByText(/^Attempt/)).not.toBeInTheDocument();
    });

    it('shows the list as a select above the log on a narrow screen', async () => {
      await renderPage(job(), '?node=test');

      giveThePageWidth(500);

      expect(screen.getByRole('combobox', { name: 'Node of the log' })).toHaveTextContent('test');
      expect(screen.queryByRole('navigation', { name: 'Node executions' })).not.toBeInTheDocument();
      expect(shownNode()).toBe('test');
    });
  });

  describe('the full screen', () => {
    it('opens from the URL, so a shared link opens the same view', async () => {
      await renderPage(job(), '?node=test&fullscreen=1');

      expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeInTheDocument();
      expect(shownNode()).toBe('test');
    });

    it('keeps the node in the URL when it opens, and drops only itself when it closes', async () => {
      await renderPage(job(), '?node=test');

      await userEvent.click(screen.getByRole('button', { name: 'Full screen' }));
      expect(lastUrl()).toBe(`${PATHNAME}?node=test&fullscreen=1`);

      await userEvent.click(await screen.findByRole('button', { name: 'Exit full screen' }));
      expect(lastUrl()).toBe(`${PATHNAME}?node=test`);
    });
  });

  it('hides the logs, keeping the job itself, without READ_JOB_LOGS', async () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.SYSTEM,
            scopeId: '',
            access: { kind: 'restricted', permissions: [Permission.READ_JOB] },
          },
        ],
      },
    });

    await renderPage(job());

    expect(
      screen.getByText("You don't have permission to view this job's logs"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('job-log-viewer')).not.toBeInTheDocument();
    expect(tailLogs).not.toHaveBeenCalled();
    // The job itself is still there: only its output is withheld.
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('re-runs an ended job and opens the new one', async () => {
    await renderPage(job());

    await userEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    await waitFor(() => expect(rerun).toHaveBeenCalledWith('job-1'));
    await waitFor(() =>
      expect(navigator.navigate.mock.calls.at(-1)?.[0]).toMatch(
        /\/pipelines\/pipeline-1\/jobs\/job-2$/,
      ),
    );
  });

  it('offers no re-run for a job that runs', async () => {
    await renderPage(job({ status: 'running', finishedAt: undefined }));

    expect(screen.queryByRole('button', { name: 'Re-run' })).not.toBeInTheDocument();
  });

  it('offers no re-run to a runner of the pipeline without the re-run of a job (CREATE_JOB)', async () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.SYSTEM,
            scopeId: '',
            access: {
              kind: 'restricted',
              permissions: [Permission.READ_JOB, Permission.RUN_PIPELINE],
            },
          },
        ],
      },
    });

    await renderPage(job());

    expect(screen.queryByRole('button', { name: 'Re-run' })).not.toBeInTheDocument();
  });

  it('reports an error instead of an empty page when the job cannot be read', async () => {
    restoreRegistry = withRegistry({
      jobs: {
        jobsRepository: {
          getById: vi.fn().mockRejectedValue(new ScyllaError('boom')),
        } as unknown as JobsRepository,
      },
    });
    navigator = installTestNavigator({ pathname: '/acme/jobs/job-1' });

    render(JobDetailsPage, { jobId: 'job-1' });

    expect(await screen.findByText('Unable to load this job')).toBeInTheDocument();
  });

  it('refuses to query at all without a job id', async () => {
    const getById = vi.fn();
    restoreRegistry = withRegistry({
      jobs: { jobsRepository: { getById } as unknown as JobsRepository },
    });
    navigator = installTestNavigator({ pathname: '/acme/jobs' });

    render(JobDetailsPage, {});

    expect(await screen.findByText('Job ID is missing')).toBeInTheDocument();
    expect(getById).not.toHaveBeenCalled();
  });

  describe('the graph of the job', () => {
    // `deploy` waits for `build` and `is-main:true`; `notify` takes the failure of `test`.
    const conditional = (overrides: Partial<JobEntity> = {}) =>
      job({
        status: 'failed',
        nodes: [
          { id: 'build', kind: 'run', deps: [], ports: [] },
          { id: 'is-main', kind: 'switch', deps: [{ node: 'build' }], ports: ['true', 'false'] },
          {
            id: 'deploy',
            kind: 'run',
            deps: [{ node: 'build' }, { node: 'is-main', port: 'true' }],
            ports: [],
          },
          { id: 'test', kind: 'run', deps: [{ node: 'build' }], ports: [] },
          { id: 'notify', kind: 'run', deps: [{ node: 'test', port: 'error' }], ports: [] },
        ],
        nodeExecutions: [
          { id: 'build', state: 'completed', attempts: 1, maxAttempts: 1, ports: [] },
          { id: 'is-main', state: 'completed', attempts: 1, maxAttempts: 1, ports: ['false'] },
          { id: 'deploy', state: 'skipped', attempts: 0, maxAttempts: 1, ports: [] },
          { id: 'test', state: 'failed', attempts: 1, maxAttempts: 1, ports: [] },
          { id: 'notify', state: 'completed', attempts: 1, maxAttempts: 1, ports: [] },
        ],
        ...overrides,
      });

    const graph = () => screen.queryByRole('region', { name: 'Graph of the job' });
    const graphNode = (id: string) =>
      within(graph()!).getByRole('button', { name: `Open the logs of ${id}` });
    const showGraph = () => userEvent.click(screen.getByRole('radio', { name: 'Graph' }));

    it('shows the list first, and the graph in its place on demand, as a saved choice', async () => {
      await renderPage(conditional());

      expect(graph()).not.toBeInTheDocument();
      await showGraph();

      expect(graph()).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Node executions' })).not.toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem('scylla.job-log.display') ?? '{}')).toMatchObject({
        nodeView: 'graph',
      });
    });

    it('draws a node not taken grey and dashed', async () => {
      await renderPage(conditional());
      await showGraph();

      // The button is the content of the node: the frame around it is dashed.
      expect(graphNode('deploy').parentElement).toHaveClass('border-dashed');
      expect(graphNode('deploy')).toHaveTextContent('Not taken');
      expect(graphNode('build').parentElement).not.toHaveClass('border-dashed');
    });

    it('opens the log of a node clicked in the graph, and marks it', async () => {
      await renderPage(conditional());
      await showGraph();

      await userEvent.click(graphNode('test'));

      await waitFor(() => expect(shownNode()).toBe('test'));
      expect(lastUrl()).toBe(`${PATHNAME}?node=test`);
      expect(graphNode('test')).toHaveAttribute('aria-pressed', 'true');
    });

    it('says above the log that a node was not taken, or where its failure went', async () => {
      const rendered = await renderPage(conditional(), '?node=deploy');
      expect(screen.getByTestId('job-log-viewer')).toHaveTextContent(
        'Not taken: the path did not reach it.',
      );
      rendered.unmount();

      await renderPage(conditional(), '?node=test');
      expect(screen.getByTestId('job-log-viewer')).toHaveTextContent(
        'The failure went to the error output: notify.',
      );
    });

    it('names the ports that a switch chose, above its log', async () => {
      await renderPage(conditional(), '?node=is-main');

      expect(screen.getByTestId('job-log-viewer')).toHaveTextContent('Ports chosen: false');
    });

    it('offers no graph for a job from before the snapshot of the nodes', async () => {
      await renderPage(job());

      expect(screen.queryByRole('radio', { name: 'Graph' })).not.toBeInTheDocument();
    });
  });
});
