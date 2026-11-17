import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/svelte';
import { contextStore } from '@platform/context';
import { withQueryClient, withRegistry } from '@test/render.ts';
import type { WorkspaceEntity } from '@base/features/workspace';
import { createDashboardPeriod } from '../dashboard-period.state.svelte.ts';

const NOW = new Date('2026-11-16T23:30:00Z');

const workspace = (overrides: Partial<WorkspaceEntity> = {}): WorkspaceEntity => ({
  id: 'org-1',
  name: 'Acme',
  slug: 'acme',
  personalTokensEnabled: true,
  timeZone: 'Europe/Paris',
  ...overrides,
});

let getMine: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  getMine = vi.fn().mockResolvedValue([workspace({ id: 'org-2', timeZone: 'Asia/Tokyo' }), workspace()]);
  cache = withQueryClient();
  restoreRegistry = withRegistry({ workspace: { workspaceRepository: { getMine } } });
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: null },
    project: { id: null, name: null },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
});

const withPeriod = async (
  body: (state: ReturnType<typeof createDashboardPeriod>) => Promise<void> | void,
) => {
  let state!: ReturnType<typeof createDashboardPeriod>;
  const cleanup = $effect.root(() => {
    state = createDashboardPeriod(() => NOW);
  });

  try {
    await body(state);
  } finally {
    cleanup();
  }
};

describe('createDashboardPeriod', () => {
  it('starts on the last 14 days', async () => {
    await withPeriod(state => {
      expect(state.period).toEqual({ kind: '14d' });
    });
  });

  it('reads the time zone of the current workspace, not of another one', async () => {
    await withPeriod(async state => {
      expect(state.timeZone).toBeNull();

      await waitFor(() => expect(state.timeZone).toBe('Europe/Paris'));
      expect(state.today()).toBe('2026-11-17');
    });
  });

  it('counts the days in UTC until the zone loads', async () => {
    getMine.mockReturnValue(new Promise(() => {}));

    await withPeriod(state => {
      expect(state.today()).toBe('2026-11-16');
      expect(state.rangeAt().from.toISOString()).toBe('2026-11-03T00:00:00.000Z');
    });
  });

  it('counts the days of the period in the zone of the workspace', async () => {
    await withPeriod(async state => {
      await waitFor(() => expect(state.timeZone).toBe('Europe/Paris'));

      state.select('7d');

      expect(state.rangeAt()).toEqual({
        from: new Date('2026-11-10T23:00:00Z'),
        to: null,
        bucket: 'day',
      });
    });
  });

  it('keeps the days of the current period when the user picks custom', async () => {
    await withPeriod(async state => {
      await waitFor(() => expect(state.timeZone).toBe('Europe/Paris'));

      state.select('custom');
      expect(state.period).toEqual({ kind: 'custom', from: '2026-11-04', to: '2026-11-17' });

      state.applyCustom('2026-11-01', '2026-11-08');
      expect(state.period).toEqual({ kind: 'custom', from: '2026-11-01', to: '2026-11-08' });

      state.select('custom');
      expect(state.period).toEqual({ kind: 'custom', from: '2026-11-01', to: '2026-11-08' });
    });
  });

  it('falls back to UTC for a zone that the browser does not know', async () => {
    getMine.mockResolvedValue([workspace({ timeZone: 'Mars/Olympus' })]);

    await withPeriod(async state => {
      await waitFor(() => expect(state.timeZone).toBe('UTC'));
    });
  });
});
