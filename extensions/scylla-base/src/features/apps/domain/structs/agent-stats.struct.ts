/** The number of jobs for each end. */
export interface JobOutcomes {
  completed: number;
  failed: number;
  cancelled: number;
  orphaned: number;
}

/** The jobs created on one day (UTC), by their end. */
export interface DayOutcomes {
  /** The start of the day, at 00:00 UTC. */
  day: string;
  outcomes: JobOutcomes;
}

/** The job stats of an agent for a period of days (by default the last 30), from the server. */
export interface AgentStats {
  agentId: string;
  outcomes: JobOutcomes;
  /** `null` when no job started and ended. */
  medianMs: number | null;
  p95Ms: number | null;
  /**
   * Each day of the period, oldest first, also the days with no job. The server starts a period at
   * the creation of the agent.
   */
  days: DayOutcomes[];
}

/** The jobs that failed or that their agent left, from which a day is an incident. */
const INCIDENT_JOBS = 3;

/** The jobs that ended. */
export const endedJobs = (outcomes: JobOutcomes): number =>
  outcomes.completed + outcomes.failed + outcomes.cancelled + outcomes.orphaned;

/** A day with many failed or orphaned jobs. */
export const isIncident = (outcomes: JobOutcomes): boolean =>
  outcomes.failed + outcomes.orphaned >= INCIDENT_JOBS;

/** The part of the ended jobs that completed, from 0 to 1, or `null` with no ended job. */
export const successRate = (outcomes: JobOutcomes): number | null => {
  const ended = endedJobs(outcomes);
  return ended === 0 ? null : outcomes.completed / ended;
};

/** The sum of the stats of some agents. */
export const sumOutcomes = (all: JobOutcomes[]): JobOutcomes =>
  all.reduce(
    (sum, item) => ({
      completed: sum.completed + item.completed,
      failed: sum.failed + item.failed,
      cancelled: sum.cancelled + item.cancelled,
      orphaned: sum.orphaned + item.orphaned,
    }),
    { completed: 0, failed: 0, cancelled: 0, orphaned: 0 },
  );

/** The outcomes of each day, flat, for a chart. */
export const dailyCountsOf = (stats: AgentStats | undefined) =>
  (stats?.days ?? []).map(({ day, outcomes }) => ({ day, ...outcomes }));
