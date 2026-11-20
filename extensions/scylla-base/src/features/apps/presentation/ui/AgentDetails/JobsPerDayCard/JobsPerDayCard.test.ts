import { describe, it, expect } from 'vitest';
import type { ComponentProps } from 'svelte';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findTooltip, render } from '@test/render.ts';
import type { AgentStats } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
import JobsPerDayCard from './JobsPerDayCard.svelte';

const TODAY = '2026-11-09';
const LAST_30 = { from: '2026-10-11', to: TODAY };

const ends = (completed: number, failed = 0, orphaned = 0) => ({
  completed,
  failed,
  cancelled: 0,
  orphaned,
});

const stats = (days: AgentStats['days']): AgentStats => ({
  agentId: 'agent-1',
  outcomes: days.reduce(
    (sum, { outcomes }) => ({
      completed: sum.completed + outcomes.completed,
      failed: sum.failed + outcomes.failed,
      cancelled: 0,
      orphaned: sum.orphaned + outcomes.orphaned,
    }),
    ends(0),
  ),
  medianMs: null,
  p95Ms: null,
  days,
});

const card = (props: Partial<ComponentProps<typeof JobsPerDayCard>> = {}) =>
  render(JobsPerDayCard, {
    stats: stats([{ day: `${TODAY}T00:00:00.000Z`, outcomes: ends(9, 1) }]),
    period: LAST_30,
    today: TODAY,
    joined: '2026-07-14',
    disabled: null,
    never: false,
    withTimeline: true,
    ...props,
  });

const bars = () => [
  ...screen.getByRole('img').querySelectorAll<HTMLElement>('[data-slot="tooltip-trigger"]'),
];

describe('JobsPerDayCard', () => {
  it('keeps a bar for each day, also with no job, and sums up the period', () => {
    card();

    expect(screen.getByRole('heading', { name: 'Jobs per day' })).toBeInTheDocument();
    expect(screen.getByText('Oct 11 – Today · 10 jobs · 90% completed')).toBeInTheDocument();
    expect(bars()).toHaveLength(30);
    expect(screen.getByText('Oct 18')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('lists only the ends with jobs in the legend, with their counts', () => {
    card();

    const legend = screen.getByRole('list');
    expect(within(legend).getByText('Completed')).toBeInTheDocument();
    expect(within(legend).getByText('9')).toBeInTheDocument();
    expect(within(legend).queryByText('Cancelled')).not.toBeInTheDocument();
    expect(within(legend).queryByText('Orphaned')).not.toBeInTheDocument();
  });

  it('gives the jobs of a day in a tooltip', async () => {
    card({
      stats: stats([{ day: '2026-11-03T00:00:00.000Z', outcomes: ends(3, 2, 6) }]),
    });

    await userEvent.hover(bars()[23]);

    const tooltip = await findTooltip();
    expect(tooltip).toHaveTextContent('Tue, Nov 3');
    expect(tooltip).toHaveTextContent('11 jobs');
    expect(within(tooltip).getByText('Orphaned')).toBeInTheDocument();
    expect(within(tooltip).queryByText('Cancelled')).not.toBeInTheDocument();
  });

  it('gives one bar for each week in a period of more than 90 days', () => {
    card({ period: { from: '2026-07-14', to: TODAY } });

    expect(screen.getByRole('heading', { name: 'Jobs per week' })).toBeInTheDocument();
    expect(bars()).toHaveLength(17);
  });

  it('hatches the days before the agent joined', () => {
    card({ joined: '2026-11-07' });

    expect(screen.getByText('Not joined yet')).toBeInTheDocument();
    expect(bars()).toHaveLength(3);
  });

  it('hatches the chart of an agent that never connected', () => {
    card({ stats: stats([]), never: true });

    expect(screen.getByText('No job yet. The agent has not connected.')).toBeInTheDocument();
    expect(screen.getByText('Oct 11 – Today · no job')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
