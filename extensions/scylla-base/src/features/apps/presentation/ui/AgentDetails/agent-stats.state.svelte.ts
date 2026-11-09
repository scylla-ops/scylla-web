import { currentPathname, currentSearch, navigateTo } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { appStateOf, type AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
import {
  endedJobs,
  type AgentStats,
} from '@base/features/apps/domain/structs/agent-stats.struct.ts';
import {
  clampPeriod,
  dayOf,
  periodBounds,
  presetPeriod,
  recentPeriod,
  type Day,
  type PeriodPreset,
  type StatsPeriod,
} from '@base/features/apps/domain/structs/stats-period.struct.ts';
import {
  parsePeriodSearch,
  writePeriodSearch,
  type PeriodChoice,
} from '@base/features/apps/presentation/mappers/period-search.mapper.ts';
import { appQueries } from '@base/features/apps/presentation/apps.queries.ts';

export interface AgentTimelineData {
  /** From the creation of the agent to today, at most a year. */
  bounds: StatsPeriod;
  /** `undefined` while it loads. */
  stats: AgentStats | undefined;
  /** `null` for a window that the user moved. */
  preset: PeriodPreset | null;
}

export interface AgentStatsView {
  /** `null` for an agent with no ended job: the chart then shows the last 30 days. */
  readonly timeline: AgentTimelineData | null;
  readonly period: StatsPeriod;
  readonly stats: AgentStats | undefined;
  readonly today: Day;
  readonly joined: Day;
  readonly disabled: Day | null;
  readonly never: boolean;
  choose: (choice: PeriodChoice) => void;
}

interface Props {
  appId: string;
  workspaceId: string;
  agent: AppEntity | undefined;
}

/**
 * The job stats of the agent page: the timeline since the creation of the agent, and the period
 * that the user chose on it. The period is in the URL, so a link or a reload keeps it.
 */
export const createAgentStats = (
  props: () => Props,
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- the time of the opening of the page, never state
  now = new Date(),
): AgentStatsView => {
  let revision = $state(0);

  const today = dayOf(now);
  const agent = $derived(props().agent);
  const joined = $derived(dayOf(agent?.createdAt || now));
  const disabled = $derived(agent?.disabledAt ? dayOf(agent.disabledAt) : null);
  const never = $derived(!!agent && appStateOf(agent) === 'never');
  const bounds = $derived(periodBounds(agent?.createdAt ?? '', now));
  const choice = $derived.by(() => {
    void revision;
    return parsePeriodSearch(currentSearch());
  });

  const canHaveTimeline = $derived(!!agent && !never);
  const timelineQuery = createQuery(() =>
    appQueries.agentStatsOf(props().appId, props().workspaceId, canHaveTimeline ? bounds : null),
  );
  const hasTimeline = $derived(
    canHaveTimeline &&
      !timelineQuery.isError &&
      (!timelineQuery.data || endedJobs(timelineQuery.data.outcomes) > 0),
  );

  const period = $derived.by(() => {
    if (!hasTimeline) return recentPeriod(now);
    return typeof choice === 'object' ? clampPeriod(choice, bounds) : presetPeriod(choice, bounds);
  });
  const periodQuery = createQuery(() =>
    appQueries.agentStatsOf(props().appId, props().workspaceId, agent ? period : null),
  );

  const choose = (next: PeriodChoice) => {
    navigateTo(`${currentPathname()}${writePeriodSearch(currentSearch(), next)}`, {
      replace: true,
    });
    revision += 1;
  };

  return {
    get timeline() {
      if (!hasTimeline) return null;
      return {
        bounds,
        stats: timelineQuery.data,
        preset: typeof choice === 'string' ? choice : null,
      };
    },
    get period() {
      return period;
    },
    get stats() {
      return periodQuery.data;
    },
    today,
    get joined() {
      return joined;
    },
    get disabled() {
      return disabled;
    },
    get never() {
      return never;
    },
    choose,
  };
};
