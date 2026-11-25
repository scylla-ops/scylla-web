import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
import { convertCronToUTC } from '@base/features/triggers/presentation/mappers/cron-timezone.mapper.ts';
import {
  addableKinds,
  freeTriggerName,
  lastRun,
  nextRun,
  triggerGroups,
  triggerSummary,
} from '../trigger-panel.presenter.ts';

const trigger = (overrides: Partial<TriggerEntity> = {}): TriggerEntity => ({
  id: 'trigger-1',
  pipelineId: 'pipeline-1',
  name: 'nightly',
  source: { kind: 'cron', expression: convertCronToUTC('0 9 * * *') },
  inputs: [],
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  fromFile: false,
  ...overrides,
});

const push = trigger({
  id: 'push',
  name: 'push',
  source: { kind: 'push', branches: ['main'], excludeBranches: [], skipCi: true },
  fromFile: true,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the rows of the triggers panel', () => {
  it('puts the triggers of the file apart from the ones that Scylla keeps, in their order', () => {
    const nightly = trigger();
    const hook = trigger({
      id: 'hook',
      source: { kind: 'webhook', webhookUrl: '', conditions: [] },
    });

    expect(triggerGroups([push, nightly, hook])).toEqual({
      fromFile: [push],
      stored: [nightly, hook],
    });
  });

  it('says what starts a run, in the local time and the words of the provider', () => {
    expect(triggerSummary(trigger())).toBe('Every day at 09:00');
    expect(triggerSummary(trigger({ source: { kind: 'cron', expression: '*/15 * * * *' } }))).toBe(
      '*/15 * * * *',
    );
    expect(triggerSummary(push)).toBe('Push · main');
    const review = trigger({
      source: { kind: 'pullRequest', branches: [], events: ['opened'], drafts: true },
    });
    expect(triggerSummary(review, 'gitlab')).toBe('Merge request · into each branch');
    const hook = trigger({
      source: {
        kind: 'webhook',
        webhookUrl: 'https://scylla.test/webhooks/1',
        conditions: [
          { source: 'header', field: 'X-GitHub-Event', operator: 'is', values: ['push'] },
        ],
      },
    });
    expect(triggerSummary(hook)).toBe('Webhook · 1 condition');
    expect(triggerSummary(trigger({ source: { kind: 'unknown' } }))).toBe('Unknown');
  });

  it('gives the last run with its result, and the reason of a failure in the title', () => {
    vi.useFakeTimers({ now: new Date('2026-11-25T12:00:00Z') });

    expect(lastRun(trigger())).toBeNull();
    const failed = lastRun(
      trigger({
        lastFiredAt: '2026-11-25T10:00:00Z',
        lastResult: { kind: 'failed', error: 'no agent' },
      }),
    );
    expect(failed).toMatchObject({ state: 'failed', result: 'Error', text: 'Last run 2 hr. ago' });
    expect(failed?.title).toContain('no agent');
    expect(
      lastRun(trigger({ lastFiredAt: '2026-11-25T11:00:00Z', lastResult: { kind: 'succeeded' } })),
    ).toMatchObject({ state: 'success', result: 'OK' });
    // An outcome newer than this build does not claim a success.
    expect(
      lastRun(trigger({ lastFiredAt: '2026-11-25T11:00:00Z', lastResult: { kind: 'unknown' } })),
    ).toMatchObject({ state: 'idle', result: 'Unknown' });
  });

  it('gives the next run of a schedule, and says when a trigger is stopped', () => {
    expect(nextRun(trigger({ nextFireAt: '2026-11-26T09:00:00Z' }))).toMatch(/^Next run /);
    expect(nextRun(trigger({ enabled: false }))).toBe('Stopped: it starts no run');
    expect(
      nextRun(
        trigger({ enabled: false, source: { kind: 'webhook', webhookUrl: '', conditions: [] } }),
      ),
    ).toBe('Stopped: its URL returns 404');
    // The file starts its Git triggers: nothing to tell.
    expect(nextRun(push)).toBeNull();
  });
});

describe('a new trigger from the panel', () => {
  it('offers schedule and webhook only, for a file pipeline or a project with no repository', () => {
    const link = { projectId: 'project-1', provider: 'github' as const, fullName: 'acme/api' };

    expect(addableKinds(true, link as never)).toEqual(['cron', 'webhook']);
    expect(addableKinds(false, null)).toEqual(['cron', 'webhook']);
    expect(addableKinds(false, link as never)).toEqual([
      'cron',
      'webhook',
      'push',
      'pullRequest',
      'tag',
    ]);
    // A link that is not known yet keeps the Git kinds, as the full editor does.
    expect(addableKinds(false, undefined)).toHaveLength(5);
  });

  it('takes the first name that no trigger of the pipeline has', () => {
    expect(freeTriggerName('Schedule', [push])).toBe('Schedule');
    expect(
      freeTriggerName('Schedule', [
        trigger({ name: 'Schedule' }),
        trigger({ id: '2', name: 'Schedule 2' }),
      ]),
    ).toBe('Schedule 3');
  });
});
