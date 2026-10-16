import { Permission, can } from '@platform/authz';
import { contextStore, scyllaNavigate } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { createNow } from '@scylla/ui/state';
import { toRune } from '@scylla/ui/stores';
import { appMutations, appQueries, type AppSecretEntity } from '@base/features/apps';
import { canListProjects, projectQueries } from '@base/features/project';
import type { AgentJob } from '@base/features/agents/domain/structs/agent-job.struct.ts';
import { agentStateOf } from '@base/features/agents/domain/structs/agent-state.struct.ts';
import {
  successRateOf,
  sumOutcomes,
} from '@base/features/agents/domain/structs/agents-summary.struct.ts';
import { agentQueries } from '@base/features/agents/presentation/agents.queries.ts';

export interface RecentJobRow {
  job: AgentJob;
  projectId: string | null;
  projectName: string;
  pipelineName: string;
  /** Start to finish, or start to now while it runs. `null` before it starts. */
  durationMs: number | null;
}

/** One agent: the entity, its stats, grants, secrets and latest jobs. */
export const createAgentDetails = (agentId: () => string) => {
  const context = toRune(contextStore);
  const organizationId = $derived(context().organization.id ?? '');

  const agentQuery = createQuery(() => agentQueries.byId(agentId()));
  const statsQuery = createQuery(() => agentQueries.statsOf(agentId()));
  const accessQuery = createQuery(() => appQueries.accessOf(agentId()));
  const secretsQuery = createQuery(() => appQueries.secretsOf(agentId()));
  const jobsQuery = createQuery(() => agentQueries.recentJobsOf(organizationId, agentId()));

  const jobs = $derived(jobsQuery.data ?? []);

  // A job carries its pipeline only: the names come from the lookups, asked once a job shows.
  const pipelinesQuery = createQuery(() =>
    agentQueries.pipelineNames(organizationId, jobs.length > 0),
  );
  // Without the permission the row shows the pipeline alone: no call, no denial toast.
  const projectsQuery = createQuery(() => ({
    ...projectQueries.lookup(organizationId),
    enabled: canListProjects(organizationId) && jobs.length > 0,
  }));

  const setSecretEnabled = createMutation(() => appMutations.setSecretEnabled(agentId()));
  const revokeSecret = createMutation(() => appMutations.revokeSecret(agentId()));

  const now = createNow(() => true, 30_000);

  let revoking = $state<AppSecretEntity | null>(null);

  const agent = $derived(agentQuery.data);
  const stats = $derived(statsQuery.data);
  const outcomes = $derived(stats ? sumOutcomes(stats.daily) : null);

  const recentJobs = $derived.by((): RecentJobRow[] => {
    const pipelines = pipelinesQuery.data ?? [];
    const projects = projectsQuery.data?.projects ?? [];
    const current = now.value;

    return jobs.map(job => {
      const pipeline = pipelines.find(candidate => candidate.id === job.pipelineId);
      const project = projects.find(candidate => candidate.id === pipeline?.projectId);
      const start = job.startedAt ? Date.parse(job.startedAt) : null;
      const end = job.finishedAt ? Date.parse(job.finishedAt) : current;

      return {
        job,
        projectId: pipeline?.projectId ?? null,
        projectName: project?.name ?? '',
        pipelineName: pipeline?.name ?? '',
        durationMs: start === null ? null : Math.max(0, end - start),
      };
    });
  });

  return {
    get organizationId() {
      return organizationId;
    },
    agentQuery,
    get agent() {
      return agent;
    },
    get state() {
      return agent ? agentStateOf(agent) : null;
    },
    get stats() {
      return stats;
    },
    get statsLoading() {
      return statsQuery.isLoading;
    },
    /** The last 30 days. */
    get outcomes() {
      return outcomes;
    },
    get successRate() {
      return outcomes ? successRateOf(outcomes) : null;
    },
    get access() {
      return accessQuery.data;
    },
    get accessLoading() {
      return accessQuery.isLoading;
    },
    get secrets() {
      return secretsQuery.data;
    },
    get secretsLoading() {
      return secretsQuery.isLoading;
    },
    get recentJobs() {
      return recentJobs;
    },
    get jobsLoading() {
      return jobsQuery.isLoading;
    },
    get now() {
      return now.value;
    },
    get canReadStats() {
      return can(Permission.READ_APP_STATS);
    },
    get canReadApp() {
      return can(Permission.READ_APP);
    },
    get canListJobs() {
      return can(Permission.LIST_JOBS_BY_ORGANIZATION, { organizationId });
    },
    get canManageSecrets() {
      return can(Permission.DELETE_APP);
    },

    canOpenJob: (row: RecentJobRow) =>
      !!row.projectId && can(Permission.READ_JOB, { projectId: row.projectId }),
    /** The job page lives under its project: the context takes the project first. */
    openJob: (row: RecentJobRow) => {
      if (!row.projectId) return;
      contextStore.getState().setProject(row.projectId, row.projectName);
      scyllaNavigate.goToJobDetails(row.job.pipelineId, row.job.id, {
        pipelineName: row.pipelineName || undefined,
      });
    },

    toggleSecret: (secret: AppSecretEntity) =>
      setSecretEnabled.mutate({ secretId: secret.id, enabled: !secret.enabled }),
    get revoking() {
      return revoking;
    },
    get isRevoking() {
      return revokeSecret.isPending;
    },
    requestRevoke: (secret: AppSecretEntity) => (revoking = secret),
    cancelRevoke: () => (revoking = null),
    confirmRevoke: () => {
      if (!revoking) return;
      revokeSecret.mutate(revoking.id, { onSettled: () => (revoking = null) });
    },
  };
};

export type AgentDetails = ReturnType<typeof createAgentDetails>;
