import { describe, it, expect } from 'vitest';
import type { AgentStats } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
import { jobsCardText, type JobsCardInput } from '../jobs-card.presenter.ts';
import { jobsChart } from '../jobs-chart.presenter.ts';

const TODAY = '2026-11-09';
const PERIOD = { from: '2026-11-03', to: TODAY };

const stats = (completed: number, failed = 0): AgentStats => ({
  agentId: 'agent-1',
  outcomes: { completed, failed, cancelled: 0, orphaned: 0 },
  medianMs: null,
  p95Ms: null,
  days: [],
});

const text = (patch: Partial<JobsCardInput> = {}) => {
  const disabled = patch.disabled ?? null;
  return jobsCardText({
    stats: stats(19, 1),
    chart: jobsChart({ period: PERIOD, days: [], joined: '2026-07-14', disabled }),
    period: PERIOD,
    today: TODAY,
    disabled,
    never: false,
    withTimeline: true,
    ...patch,
  });
};

describe('jobsCardText', () => {
  it('sums up the jobs of the period', () => {
    expect(text()).toEqual({
      summary: 'Nov 3 – Today · 20 jobs · 95% completed',
      label: '20 jobs, Nov 3 – Today',
      zones: [],
      note: null,
    });
  });

  it('tells where the jobs are when a disabled agent has none in the period', () => {
    const result = text({ stats: stats(0), disabled: '2026-11-05' });

    expect(result.summary).toBe('Nov 3 – Today · disabled since Nov 5');
    expect(result.zones).toEqual([{ start: 3, end: 7, label: 'Disabled since Nov 5' }]);
    expect(result.note).toBe(
      'No job in this period. Drag the timeline window before Nov 5 to see the jobs.',
    );
  });

  it('gives no drag hint with no timeline', () => {
    expect(text({ stats: stats(0), disabled: '2026-11-05', withTimeline: false }).note).toBeNull();
  });

  it('hatches all the chart of an agent that never connected', () => {
    const result = text({ stats: stats(0), never: true });

    expect(result.summary).toBe('Nov 3 – Today · no job');
    expect(result.zones).toEqual([{ start: 0, end: 7 }]);
    expect(result.note).toBe('No job yet. The agent has not connected.');
  });
});
