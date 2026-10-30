import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { Permission, authorizationReady, can } from '@platform/authz';
import {
  APP_ACCESS_QUERY_KEY,
  APP_QUERY_KEY,
  APP_SECRETS_QUERY_KEY,
  appMutations,
} from '@base/features/apps';
import type {
  AgentEntity,
  AgentStats,
  CreatedAgent,
  AgentJob,
  AgentJobPipeline,
} from '../domain/entities/agent.entity.ts';
import type { AgentsModule } from '../agents.module.ts';

// Resolved per call: tests swap the registry.
const repository = () => getModuleDomain<typeof AgentsModule.domain>('agents').agentsRepository;

export const AGENTS_QUERY_KEY = (organizationId: string) => ['agents', organizationId] as const;
export const AGENT_QUERY_KEY = (agentId: string) => ['agents', 'detail', agentId] as const;
export const CREATE_AGENT_MUTATION_KEY = ['agents', 'create'] as const;
export const AGENT_STATS_QUERY_KEY = (agentId: string) => ['agents', 'stats', agentId] as const;
export const AGENT_JOBS_QUERY_KEY = (agentId: string) => ['agents', 'jobs', agentId] as const;
export const PIPELINE_NAMES_QUERY_KEY = (organizationId: string) =>
  ['agents', 'pipeline-names', organizationId] as const;

/** The recent jobs of one agent: the first page only. */
export const RECENT_JOBS_LIMIT = 5;

const LIVE = { refetchInterval: 10_000, refetchIntervalInBackground: false } as const;

export const agentQueries = {
  /**
   * Not asked without `LIST_AGENTS` (a sure denial, toasted on every page). So an
   * empty list means "no agents", never "not allowed": branch on the permission first.
   */
  byOrganization: (organizationId: string) =>
    queryOptions<AgentEntity[]>({
      queryKey: AGENTS_QUERY_KEY(organizationId),
      enabled: !!organizationId && can(Permission.LIST_AGENTS),
      ...LIVE,
      queryFn: () => repository().listAgents(organizationId),
    }),

  byId: (agentId: string) =>
    queryOptions<AgentEntity>({
      queryKey: AGENT_QUERY_KEY(agentId),
      enabled: !!agentId,
      ...LIVE,
      queryFn: () => repository().getAgent(agentId),
    }),

  statsOf: (agentId: string) =>
    queryOptions<AgentStats>({
      queryKey: AGENT_STATS_QUERY_KEY(agentId),
      enabled: !!agentId && can(Permission.READ_APP_STATS),
      ...LIVE,
      queryFn: () => repository().getAgentStats(agentId),
    }),

  /**
   * `ListOrganizationJobs` with `agent_id`. Here and not in `jobs`: `jobs` and `pipeline` import
   * this module, so it cannot import them back.
   */
  recentJobsOf: (organizationId: string, agentId: string) =>
    queryOptions<AgentJob[]>({
      queryKey: AGENT_JOBS_QUERY_KEY(agentId),
      enabled:
        authorizationReady() &&
        !!organizationId &&
        !!agentId &&
        can(Permission.LIST_JOBS_BY_ORGANIZATION, { organizationId }),
      ...LIVE,
      queryFn: () => repository().listJobs(organizationId, agentId, RECENT_JOBS_LIMIT),
    }),

  /** The names of the recent jobs. Asked only once a job shows. */
  pipelineNames: (organizationId: string, wanted: boolean) =>
    queryOptions<AgentJobPipeline[]>({
      queryKey: PIPELINE_NAMES_QUERY_KEY(organizationId),
      enabled:
        wanted &&
        !!organizationId &&
        can(Permission.LIST_PIPELINES_BY_ORGANIZATION, { organizationId }),
      staleTime: 30_000,
      queryFn: () => repository().listPipelineNames(organizationId),
    }),
};

const invalidateList = (organizationId: string) =>
  getQueryClient().invalidateQueries({ queryKey: AGENTS_QUERY_KEY(organizationId) });

const invalidateAgent = (agentId: string) =>
  getQueryClient().invalidateQueries({ queryKey: AGENT_QUERY_KEY(agentId) });

/** An agent is an app: its app entries go with it. */
const entriesOf = (agentId: string) => [
  AGENT_QUERY_KEY(agentId),
  AGENT_STATS_QUERY_KEY(agentId),
  AGENT_JOBS_QUERY_KEY(agentId),
  APP_QUERY_KEY(agentId),
  APP_SECRETS_QUERY_KEY(agentId),
  APP_ACCESS_QUERY_KEY(agentId),
];

/**
 * Before the refetch of the list: until it comes back, the cached list holds the agent, and its
 * row asks CE for an app that no longer exists ("not found" toasts).
 */
const forgetAgent = async (organizationId: string, agentId: string) => {
  const client = getQueryClient();
  const list = AGENTS_QUERY_KEY(organizationId);
  const entries = entriesOf(agentId);
  await Promise.all(
    [list, ...entries].map(queryKey => client.cancelQueries({ queryKey, exact: true })),
  );
  client.setQueryData<AgentEntity[]>(list, agents => agents?.filter(agent => agent.id !== agentId));
  for (const queryKey of entries) client.removeQueries({ queryKey, exact: true });
};

export const agentMutations = {
  /**
   * The secret passes through once and is never stored: `gcTime: 0` drops the mutation and its
   * result from the cache once the dialog that ran it goes.
   */
  create: (organizationId: string) =>
    mutationOptions({
      mutationKey: CREATE_AGENT_MUTATION_KEY,
      gcTime: 0,
      mutationFn: ({ name }: { name: string }): Promise<CreatedAgent> =>
        repository().createAgent(organizationId, name),
      onSuccess: () => void invalidateList(organizationId),
    }),

  remove: (organizationId: string) =>
    mutationOptions({
      mutationFn: (agentId: string) => repository().deleteAgent(agentId),
      onSuccess: async (_data, agentId) => {
        await forgetAgent(organizationId, agentId);
        void invalidateList(organizationId);
      },
    }),

  /** An agent is an app: `SetAppActive` of `apps`, plus the agent entries it changes. */
  setActive: (organizationId: string) => {
    const app = appMutations.setActive(organizationId);
    return mutationOptions({
      ...app,
      onSuccess: (...args: Parameters<NonNullable<typeof app.onSuccess>>) => {
        void app.onSuccess?.(...args);
        void invalidateList(organizationId);
        void invalidateAgent(args[1].appId);
      },
    });
  },
};
