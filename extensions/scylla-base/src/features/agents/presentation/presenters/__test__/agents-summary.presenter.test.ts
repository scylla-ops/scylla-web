// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type {
  AgentEntity,
  AgentStats,
  DailyOutcome,
} from '@base/features/agents/domain/entities/agent.entity.ts';
import { successRateOf, sumOutcomes, summarizeAgents } from '../agents-summary.presenter.ts';

const agent = (id: string, overrides: Partial<AgentEntity> = {}): AgentEntity => ({
  id,
  organizationId: 'org-1',
  name: id,
  isActive: true,
  connected: true,
  lastSeen: '2026-10-11T08:00:00.000Z',
  inFlight: 0,
  host: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const day = (overrides: Partial<DailyOutcome> = {}): DailyOutcome => ({
  day: '2026-10-10T00:00:00.000Z',
  completed: 0,
  failed: 0,
  cancelled: 0,
  orphaned: 0,
  medianDurationMs: null,
  ...overrides,
});

const statsWith = (daily: DailyOutcome[]) => ({ daily }) as AgentStats;

describe('sumOutcomes', () => {
  it('adds the four outcomes of every day, orphaned included', () => {
    expect(
      sumOutcomes([day({ completed: 3, failed: 1 }), day({ cancelled: 1, orphaned: 2 })]),
    ).toEqual({ completed: 3, failed: 1, cancelled: 1, orphaned: 2, total: 7 });
  });
});

describe('successRateOf', () => {
  it('divides the completed jobs by every finished job', () => {
    expect(successRateOf(sumOutcomes([day({ completed: 24, failed: 1 })]))).toBe(0.96);
  });

  it('is unknown, not 0 %, when nothing finished', () => {
    expect(successRateOf(sumOutcomes([]))).toBeNull();
  });
});

describe('summarizeAgents', () => {
  const agents = [
    agent('idle-1'),
    agent('runner', { inFlight: 2 }),
    agent('gone', { connected: false }),
    agent('fresh', { connected: false, lastSeen: '' }),
    agent('off', { isActive: false }),
  ];

  it('counts online agents out of all of them, disabled ones included', () => {
    const summary = summarizeAgents(agents, () => undefined);

    expect(summary.online).toBe(2);
    expect(summary.total).toBe(5);
  });

  it('counts the running jobs and names the agents that run them', () => {
    const summary = summarizeAgents(agents, () => undefined);

    expect(summary.running).toBe(1);
    expect(summary.runningJobs).toBe(2);
    expect(summary.runningNames).toEqual(['runner']);
  });

  it('needs attention for offline and never connected agents, not for disabled ones', () => {
    const summary = summarizeAgents(agents, () => undefined);

    expect(summary.offline).toBe(1);
    expect(summary.never).toBe(1);
  });

  it('sums the 30 days of every agent whose stats are known', () => {
    const summary = summarizeAgents(agents, id =>
      id === 'idle-1'
        ? statsWith([day({ completed: 20, failed: 1 })])
        : id === 'runner'
          ? statsWith([day({ completed: 4 })])
          : undefined,
    );

    expect(summary.outcomes.total).toBe(25);
    expect(successRateOf(summary.outcomes)).toBe(0.96);
  });
});
