import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { waitFor } from '@testing-library/svelte';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { installTestNavigator } from '@test/navigator.ts';
import { withQueryClient, withRegistry } from '@test/render.ts';
import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
import type { StatsPeriod } from '@base/features/apps/domain/structs/stats-period.struct.ts';
import { createAgentStats } from './agent-stats.state.svelte.ts';

const NOW = new Date('2026-11-09T10:00:00Z');
const TODAY = { from: '2026-11-09', to: '2026-11-09' };

const agent = (patch: Partial<AppEntity> = {}): AppEntity =>
  ({
    id: 'agent-1',
    workspaceId: 'ws-1',
    name: 'build-linux-01',
    runner: true,
    connected: true,
    lastSeenAt: '2026-11-09T09:00:00.000Z',
    createdAt: '2026-07-14T15:00:00.000Z',
    disabledAt: '',
    ...patch,
  }) as AppEntity;

const stats = (completed: number) => ({
  agentId: 'agent-1',
  outcomes: { completed, failed: 0, cancelled: 0, orphaned: 0 },
  medianMs: null,
  p95Ms: null,
  days: [],
});

let getAgentStats: ReturnType<typeof vi.fn>;
let navigator: ReturnType<typeof installTestNavigator>;
let teardown: Array<() => void> = [];

const openedWith = (search: string, completed = 468) => {
  getAgentStats = vi.fn().mockResolvedValue(stats(completed));
  navigator = installTestNavigator({ pathname: '/acme/agents/agent-1', search });
  const cache = withQueryClient();
  teardown = [
    navigator.restore,
    cache.restore,
    withRegistry({ apps: { appsRepository: { getAgentStats } } }),
  ];
};

const withStats = async (
  details: AppEntity,
  body: (view: ReturnType<typeof createAgentStats>) => Promise<void> | void,
) => {
  let view!: ReturnType<typeof createAgentStats>;
  const cleanup = $effect.root(() => {
    view = createAgentStats(() => ({ appId: 'agent-1', workspaceId: 'ws-1', agent: details }), NOW);
  });
  try {
    await body(view);
  } finally {
    cleanup();
  }
};

const asked = (): (StatsPeriod | undefined)[] =>
  getAgentStats.mock.calls.map(([, period]) => period as StatsPeriod | undefined);

beforeEach(() => {
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: {
            kind: 'restricted',
            permissions: [Permission.READ_APP, Permission.READ_APP_STATS],
          },
        },
      ],
    },
  });
  openedWith('');
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('createAgentStats', () => {
  it('asks for the days since the creation of the agent and for the last 30 days', async () => {
    await withStats(agent(), async view => {
      await waitFor(() => expect(view.timeline?.stats).toBeDefined());

      expect(view.timeline).toMatchObject({
        bounds: { from: '2026-07-14', to: '2026-11-09' },
        preset: '30d',
      });
      expect(view.period).toEqual({ from: '2026-10-11', to: '2026-11-09' });
      expect(asked()).toEqual([
        { from: '2026-07-14', to: '2026-11-09' },
        { from: '2026-10-11', to: '2026-11-09' },
      ]);
    });
  });

  it('reads the period of a link, and keeps it in the bounds', async () => {
    openedWith('?from=2026-01-01&to=2026-09-29');

    await withStats(agent(), view => {
      expect(view.period).toEqual({ from: '2026-07-14', to: '2026-09-29' });
      expect(view.timeline?.preset).toBeNull();
    });
  });

  it('writes a new period in the URL, in place of the current entry', async () => {
    await withStats(agent(), view => {
      view.choose({ from: '2026-09-09', to: '2026-09-29' });
      flushSync();

      expect(navigator.navigate).toHaveBeenCalledWith(
        '/acme/agents/agent-1?from=2026-09-09&to=2026-09-29',
        { replace: true },
      );
      expect(view.period).toEqual({ from: '2026-09-09', to: '2026-09-29' });

      view.choose('7d');
      flushSync();

      expect(view.period).toEqual({ from: '2026-11-03', to: '2026-11-09' });
      expect(view.timeline?.preset).toBe('7d');
    });
  });

  it('shows the timeline of an agent with jobs from the day that it joined', async () => {
    await withStats(agent({ createdAt: '2026-11-09T08:00:00.000Z' }), async view => {
      await waitFor(() => expect(view.timeline?.stats).toBeDefined());

      expect(view.timeline).toMatchObject({ bounds: TODAY, preset: '30d' });
      expect(view.period).toEqual(TODAY);
      expect(asked()).toEqual([TODAY]);
    });
  });

  it('shows the timeline of an agent of one day, and keeps the preset that the user chose', async () => {
    const life = { from: '2026-11-08', to: '2026-11-09' };

    await withStats(agent({ createdAt: '2026-11-08T22:00:00.000Z' }), async view => {
      await waitFor(() => expect(view.timeline?.stats).toBeDefined());

      expect(view.timeline?.bounds).toEqual(life);
      expect(view.period).toEqual(life);

      view.choose('7d');
      flushSync();

      expect(view.period).toEqual(life);
      expect(view.timeline?.preset).toBe('7d');

      view.choose('all');
      flushSync();

      expect(view.period).toEqual(life);
      expect(view.timeline?.preset).toBe('all');
    });
  });

  it('shows no timeline for an agent with no ended job, but its last 30 days', async () => {
    openedWith('?period=7d', 0);

    await withStats(agent({ createdAt: '2026-11-08T22:00:00.000Z' }), async view => {
      await waitFor(() => expect(view.timeline).toBeNull());

      expect(view.joined).toBe('2026-11-08');
      expect(view.period).toEqual({ from: '2026-10-11', to: '2026-11-09' });
    });
  });

  it('shows no timeline for an agent that never connected', async () => {
    await withStats(agent({ connected: false, lastSeenAt: '' }), view => {
      expect(view.never).toBe(true);
      expect(view.timeline).toBeNull();
    });
  });

  it('gives the day that the agent was disabled', async () => {
    await withStats(agent({ disabledAt: '2026-10-02T14:00:00.000Z' }), view => {
      expect(view.disabled).toBe('2026-10-02');
    });
  });
});
