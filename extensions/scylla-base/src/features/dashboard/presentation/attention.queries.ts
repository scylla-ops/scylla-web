import { getModuleDomain, queryOptions } from '@scylla/core-sdk';
import type { AttentionRepository } from '../domain/repository/attention.repository.ts';
import type { DashboardPreferences } from '../domain/repository/dashboard-layout.repository.ts';
import type { AttentionList } from '../domain/structs/attention.struct.ts';

const repository = () =>
  getModuleDomain<{ attentionRepository: AttentionRepository }>('dashboard').attentionRepository;

const REFRESH_MS = 30_000;
const LIMIT = 50;

export const attentionQueries = {
  /** The open items of the workspace, or of one project. `since` marks the new ones. */
  list: (workspaceId: string | null, projectId: string | null, since: string | null, enabled = true) =>
    queryOptions<AttentionList>({
      queryKey: ['dashboard', 'attention', workspaceId, projectId, since] as const,
      queryFn: () =>
        repository().list({
          workspaceId: workspaceId ?? '',
          projectIds: projectId ? [projectId] : [],
          since,
          limit: LIMIT,
        }),
      enabled: enabled && !!workspaceId,
      staleTime: REFRESH_MS / 2,
      refetchInterval: REFRESH_MS,
    }),
};

const visits = new Map<string, string | null>();

/**
 * The last visit before this one, for "new": read once for each workspace and page load, then the
 * visit of now replaces it.
 */
export const visitSince = (workspaceId: string): string | null => {
  if (!visits.has(workspaceId)) {
    const preferences = getModuleDomain<{ dashboardPreferences: DashboardPreferences }>('dashboard')
      .dashboardPreferences;
    visits.set(workspaceId, preferences.lastVisit(workspaceId));
    preferences.setLastVisit(workspaceId, new Date().toISOString());
  }
  return visits.get(workspaceId) ?? null;
};
