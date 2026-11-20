import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { StatsPeriod } from '@base/features/apps/domain/structs/stats-period.struct.ts';
import { createTimelineWindow, type TimelineWindow } from './timeline-window.state.svelte.ts';

const BOUNDS = { from: '2026-07-14', to: '2026-11-09' };
const PERIOD = { from: '2026-10-11', to: '2026-11-09' };

const withWindow = (
  body: (window: TimelineWindow, onChange: ReturnType<typeof vi.fn>) => void,
  bounds: StatsPeriod = BOUNDS,
  first: StatsPeriod = PERIOD,
) => {
  const onChange = vi.fn();
  const cleanup = $effect.root(() => {
    let period = $state<StatsPeriod>(first);
    const window = createTimelineWindow(() => ({
      period,
      bounds,
      onChange: (next: StatsPeriod) => {
        onChange(next);
        period = next;
      },
    }));
    body(window, onChange);
  });
  cleanup();
};

describe('createTimelineWindow', () => {
  it('shows the dragged period, and chooses it only at the end of the drag', () => {
    withWindow((window, onChange) => {
      window.begin();
      window.drag('move', -10);
      window.drag('move', -32);
      flushSync();

      expect(window.dragging).toBe(true);
      expect(window.shown).toEqual({ from: '2026-09-09', to: '2026-10-08' });
      expect(onChange).not.toHaveBeenCalled();

      window.end();
      flushSync();

      expect(window.dragging).toBe(false);
      expect(onChange).toHaveBeenCalledExactlyOnceWith({ from: '2026-09-09', to: '2026-10-08' });
      expect(window.shown).toEqual({ from: '2026-09-09', to: '2026-10-08' });
    });
  });

  it('moves one edge from where the drag began', () => {
    withWindow((window, onChange) => {
      window.begin();
      window.drag('start', -30);
      window.drag('start', -10);
      window.end();

      expect(onChange).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-11-09' });
    });
  });

  it('chooses nothing for a click with no move', () => {
    withWindow((window, onChange) => {
      window.begin();
      window.end();

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('moves an edge at once for the keyboard, and not past today', () => {
    withWindow((window, onChange) => {
      window.step('start', 7);
      window.step('end', 1);

      expect(onChange).toHaveBeenCalledExactlyOnceWith({ from: '2026-10-18', to: '2026-11-09' });
    });
  });

  it('keeps the one day of a strip of one day, for a drag and for the keyboard', () => {
    const today = { from: '2026-11-09', to: '2026-11-09' };

    withWindow(
      (window, onChange) => {
        window.begin();
        window.drag('move', -3);
        window.drag('start', -2);
        window.drag('end', 2);
        flushSync();

        expect(window.shown).toEqual(today);

        window.end();
        window.step('start', -1);
        window.step('start', 7);
        window.step('end', 1);
        window.step('end', -7);

        expect(onChange).not.toHaveBeenCalled();
        expect(window.shown).toEqual(today);
      },
      today,
      today,
    );
  });
});
