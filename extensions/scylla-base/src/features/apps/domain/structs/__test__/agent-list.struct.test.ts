// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  agentStatusOf,
  countByFilter,
  dailyJobs,
  matchesFilter,
  matchesSearch,
  summarizeAgents,
} from '../agent-list.struct.ts';

const agent = (patch: Partial<Parameters<typeof agentStatusOf>[0]> = {}) => ({
  runner: true,
  connected: true,
  lastSeenAt: '2026-01-01T00:00:00.000Z',
  runningJobs: 0,
  disabledAt: '',
  ...patch,
});

const running = agent({ runningJobs: 2 });
const online = agent();
const offline = agent({ connected: false });
const never = agent({ connected: false, lastSeenAt: '' });
const disabled = agent({
  connected: false,
  runningJobs: 1,
  disabledAt: '2026-10-02T00:00:00.000Z',
});
const all = [running, online, offline, never, disabled];

describe('agent list', () => {
  it('gives the state of each agent', () => {
    expect(all.map(agentStatusOf)).toEqual(['running', 'online', 'offline', 'never', 'disabled']);
  });

  it('counts a running agent as online', () => {
    expect(countByFilter(all)).toEqual({ all: 5, online: 2, offline: 1, never: 1, disabled: 1 });
    expect(all.filter(item => matchesFilter(item, 'online'))).toEqual([running, online]);
    expect(all.filter(item => matchesFilter(item, 'all'))).toHaveLength(5);
  });

  it('sums the running jobs of the enabled agents only', () => {
    expect(summarizeAgents(all)).toEqual({
      total: 5,
      online: 2,
      runningJobs: 2,
      offline: 1,
      never: 1,
    });
  });

  it('finds an agent by its name or its host name, in any case', () => {
    const item = { name: 'build-linux-01', host: { hostname: 'DESKTOP-7Q2M1' } as never };
    expect(matchesSearch(item, 'LINUX')).toBe(true);
    expect(matchesSearch(item, 'desktop')).toBe(true);
    expect(matchesSearch(item, 'mac')).toBe(false);
    expect(matchesSearch({ name: 'gpu', host: null }, '  ')).toBe(true);
  });

  it('gives the ended jobs of each day', () => {
    const day = (completed: number, failed: number) => ({
      day: '',
      outcomes: { completed, failed, cancelled: 0, orphaned: 0 },
    });
    expect(dailyJobs({ days: [day(1, 2), day(0, 0)] })).toEqual([3, 0]);
  });
});
