// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { activityLevel } from '../agent-activity.presenter.ts';

describe('activityLevel', () => {
  it('shows nothing more than the next step for an agent with no ended job', () => {
    expect(activityLevel(false, { from: '2026-07-14', to: '2026-11-09' })).toBe('none');
  });

  it('gives one line to an agent that joined today', () => {
    expect(activityLevel(true, { from: '2026-11-09', to: '2026-11-09' })).toBe('line');
  });

  it('gives the chart with no timeline to an agent that joined fewer than 14 days ago', () => {
    expect(activityLevel(true, { from: '2026-11-08', to: '2026-11-09' })).toBe('chart');
    expect(activityLevel(true, { from: '2026-10-27', to: '2026-11-09' })).toBe('timeline');
    expect(activityLevel(true, { from: '2026-10-28', to: '2026-11-09' })).toBe('chart');
  });
});
