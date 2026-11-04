import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import AgentOutcomesChart from './AgentOutcomesChart.svelte';

const agent = (overrides: Record<string, unknown> = {}) => ({
  id: 'agent-1',
  workspaceId: 'org-1',
  name: 'runner-1',
  runner: true,
  connected: true,
  lastSeenAt: '',
  host: null,
  createdAt: '',
  ...overrides,
});

const isoDaysAgo = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

type Ended = 'completed' | 'failed' | 'cancelled';

/** The jobs of one day: the chart counts them by their end. */
const day = (daysAgo: number, counts: Partial<Record<Ended, number>> = {}) =>
  (Object.entries(counts) as [Ended, number][]).flatMap(([status, count]) =>
    Array.from({ length: count }, (_, index) => ({
      id: `${daysAgo}-${status}-${index}`,
      pipelineId: 'p',
      projectId: 'pr',
      status,
      createdAt: isoDaysAgo(daysAgo),
      startedAt: isoDaysAgo(daysAgo),
      finishedAt: isoDaysAgo(daysAgo),
    })),
  );

/** The jobs of the agent over the days. */
const stats = (days: ReturnType<typeof day>[]) => days.flat();

let listAgents: ReturnType<typeof vi.fn>;
let getAgentStats: Mock<(appId: string) => Promise<unknown>>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

const drawnSeries = (container: HTMLElement): string[] =>
  [...container.querySelectorAll('path[stroke]')].map(path => path.getAttribute('stroke') ?? '');

beforeEach(() => {
  listAgents = vi.fn().mockResolvedValue([agent()]);
  getAgentStats = vi
    .fn<(appId: string) => Promise<unknown>>()
    .mockResolvedValue(stats([day(1, { completed: 3, failed: 1, cancelled: 2 })]));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    apps: {
      appsRepository: {
        listApps: listAgents,
        listJobs: (_workspaceId: string, appId: string) => getAgentStats(appId),
      },
    },
  });

  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: null },
    project: { id: null, name: null },
  });
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access: {
            kind: 'restricted',
            permissions: [Permission.LIST_AGENTS, Permission.READ_APP_STATS],
          },
        },
      ],
    },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

describe('AgentOutcomesChart', () => {
  it('asks for nothing and explains itself when the workspace has no agent', async () => {
    listAgents.mockResolvedValue([]);
    render(AgentOutcomesChart);

    expect(
      await screen.findByText('No agents found. Connect an agent to see execution history.'),
    ).toBeInTheDocument();
    expect(getAgentStats).not.toHaveBeenCalled();
  });

  it('reads the first agent’s stats without being asked to pick one', async () => {
    render(AgentOutcomesChart);

    await screen.findByRole('img', { name: 'Agent Outcomes' });
    expect(getAgentStats).toHaveBeenCalledWith('agent-1');
  });

  it('switches to the agent the reader picks', async () => {
    const user = userEvent.setup();
    listAgents.mockResolvedValue([agent(), agent({ id: 'agent-2', name: 'runner-2' })]);
    render(AgentOutcomesChart);

    await user.click(await screen.findByRole('button', { name: 'runner-2' }));

    expect(getAgentStats).toHaveBeenCalledWith('agent-2');
  });

  it('draws the three series, with a legend, until a filter narrows it to one', async () => {
    const user = userEvent.setup();
    const { container } = render(AgentOutcomesChart);

    await screen.findByRole('img', { name: 'Agent Outcomes' });
    expect(drawnSeries(container)).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'failed' }));

    expect(drawnSeries(container)).toEqual(['var(--destructive)']);
  });

  it('says so rather than drawing an empty frame when nothing finished in the window', async () => {
    getAgentStats.mockResolvedValue(stats([]));
    render(AgentOutcomesChart);

    expect(await screen.findByText('No finished jobs in this window.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Agent Outcomes' })).not.toBeInTheDocument();
  });

  it('narrows the window to the range picked, which can empty it', async () => {
    const user = userEvent.setup();
    // Only the range button decides.
    getAgentStats.mockResolvedValue(stats([day(9, { completed: 2 })]));
    render(AgentOutcomesChart);

    await screen.findByRole('img', { name: 'Agent Outcomes' });

    await user.click(screen.getByRole('button', { name: '7d' }));

    expect(screen.getByText('No finished jobs in this window.')).toBeInTheDocument();
  });

  it('labels the y axis in whole runs, from zero to above the peak', async () => {
    const { container } = render(AgentOutcomesChart);

    await screen.findByRole('img', { name: 'Agent Outcomes' });
    // Only the y axis: the x axis shows the day of the month, which can also be "1".
    const axis = within(container.querySelector<HTMLElement>('[data-slot="y-axis"]')!);
    // Whole runs only: the axis never shows "1.5 runs".
    for (const tick of ['0', '1', '2', '3']) {
      expect(axis.getByText(tick)).toBeInTheDocument();
    }
  });
});
