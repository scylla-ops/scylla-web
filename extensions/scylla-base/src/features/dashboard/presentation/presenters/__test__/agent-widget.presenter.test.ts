import { describe, it, expect } from 'vitest';
import type { AppEntity, AppJob } from '@base/features/apps';
import type { PipelineSummary } from '@base/features/pipeline';
import { agentLoad, agentSlots, loadBars, recentTones } from '../agent-widget.presenter.ts';
import { DATA, targetOptions } from '../widget-catalog.presenter.ts';

const MB = 1024 * 1024;

const agent = (overrides: Partial<AppEntity> = {}): AppEntity =>
  ({
    id: 'agent-1',
    name: 'runner-eu-1',
    connected: true,
    runningJobs: 1,
    disabledAt: '',
    lastSeenAt: '2026-11-20T09:00:00Z',
    host: { capacity: 3, totalMemoryMb: 1000 },
    lastSample: { at: '2026-11-20T09:00:00Z', cpuPercent: 71.6, memoryUsedBytes: 480 * MB },
    ...overrides,
  }) as AppEntity;

describe('the widget of one agent', () => {
  it('gives a slot for each job of the capacity, and one offline slot when not connected', () => {
    expect(agentSlots(agent())).toEqual(['busy', 'free', 'free']);
    expect(agentSlots(agent({ connected: false }))).toEqual(['offline']);
  });

  it('gives the last load in percent, and none when not connected', () => {
    expect(agentLoad(agent())).toEqual({ cpu: 72, ram: 48 });
    expect(agentLoad(agent({ connected: false }))).toEqual({ cpu: null, ram: null });
  });

  it('gives no bar for an hour with no sample', () => {
    expect(
      loadBars(
        [
          { start: 'a', samples: 4, cpuPercent: 12.4, memoryBytes: 250 * MB },
          { start: 'b', samples: 0, cpuPercent: 0, memoryBytes: 0 },
        ],
        1000,
      ),
    ).toEqual([
      { start: 'a', cpu: 12, ram: 25 },
      { start: 'b', cpu: null, ram: null },
    ]);
  });

  it('shows the last ended jobs, oldest first', () => {
    const jobs = [
      { id: '3', status: 'running', createdAt: '' },
      { id: '2', status: 'failed', createdAt: '', finishedAt: 'x' },
      { id: '1', status: 'completed', createdAt: '', finishedAt: 'x' },
    ] as AppJob[];
    expect(recentTones(jobs, 20)).toEqual(['passed', 'failed']);
  });
});

describe('the target of a dedicated widget', () => {
  it('lists the enabled agents or the pipelines, by name', () => {
    const agents = [agent({ id: 'b', name: 'zeta' }), agent({ id: 'a', name: 'alpha' }), agent({ id: 'c', name: 'off', disabledAt: 'x' })];
    const pipelines = [{ id: 'p', name: 'lint', projectName: 'web' }] as PipelineSummary[];
    expect(targetOptions('agent', agents, pipelines).map(option => option.id)).toEqual(['a', 'b']);
    expect(targetOptions('pipeline', agents, pipelines)).toEqual([{ id: 'p', label: 'lint', detail: 'web' }]);
  });

  it('asks a target for the agent and the pipeline widgets only', () => {
    expect(DATA.agent.target).toBe('agent');
    expect(DATA.pipeline.target).toBe('pipeline');
    expect(DATA['runs-by-hour'].target).toBeUndefined();
  });
});
