import { currentPathname, navigateBack, navigateTo, type NavigateOptions } from '@scylla/core-sdk';
import { contextStore } from './context.store.ts';
import { slugifyWorkspaceName } from '@shared/utils/slug.ts';

/** Builds the URL from the current workspace and project, read at call time. */

/** The slug of the active workspace. A context saved before the slugs has its name only. */
export const activeWorkspaceSlug = (): string | null => {
  const { slug, name } = contextStore.getState().workspace;
  return slug || (name ? slugifyWorkspaceName(name) : null);
};

const getWorkspacePrefix = () => {
  const slug = activeWorkspaceSlug();
  return slug ? `/${slug}` : '';
};

const goToSubRoute = (subPath: string, options = {}) => {
  const pathname = currentPathname();
  const base = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
  navigateTo(`${base}/${cleanSubPath}`, options);
};

const goToProject = (id: string, name: string) => {
  navigateTo(`${getWorkspacePrefix()}/projects/${id}`);
  contextStore.getState().setProject(id, name);
};

const goToCreatePipeline = () => {
  navigateTo(`${getWorkspacePrefix()}/projects/${contextStore.getState().project.id}/create`);
};

const goToEditPipeline = (id: string, name: string) => {
  navigateTo(`${getWorkspacePrefix()}/projects/${contextStore.getState().project.id}/edit/${id}`);
  contextStore.getState().setPipeline(id, name);
};

// No `name`: the caller is already inside this pipeline.
const goToJobs = (id: string, name?: string) => {
  const projectId = contextStore.getState().project.id;
  navigateTo(`${getWorkspacePrefix()}/projects/${projectId}/pipelines/${id}/jobs`);
  if (name) contextStore.getState().setPipeline(id, name);
};

const goToJobDetails = (
  pipelineId: string,
  jobId: string,
  options: { nodeId?: string; pipelineName?: string } = {},
) => {
  const projectId = contextStore.getState().project.id;
  const query = options.nodeId ? `?nodes=${encodeURIComponent(options.nodeId)}` : '';
  navigateTo(
    `${getWorkspacePrefix()}/projects/${projectId}/pipelines/${pipelineId}/jobs/${jobId}${query}`,
  );
  if (options.pipelineName)
    contextStore.getState().setPipeline(pipelineId, options.pipelineName);
};

const goToTriggers = (id: string, name: string) => {
  const projectId = contextStore.getState().project.id;
  navigateTo(`${getWorkspacePrefix()}/projects/${projectId}/pipelines/${id}/triggers`);
  contextStore.getState().setPipeline(id, name);
};

const goToUser = (userId: string) => {
  navigateTo(`${getWorkspacePrefix()}/instance/users/${userId}`);
};

/** The account of the session. */
const goToAccount = () => {
  navigateTo(`${getWorkspacePrefix()}/account`);
};

/** The URL of a page of any workspace, the active one or not, from its slug. With no path, its dashboard. */
export const workspaceUrl = (slug: string, path = 'dashboard'): string => `/${slug}/${path}`;

const goToAgentDetails = (agentId: string) => {
  navigateTo(`${getWorkspacePrefix()}/agents/${agentId}`);
};

const goToWorkspaceRoute = (path: string, options?: NavigateOptions) => {
  navigateTo(`${getWorkspacePrefix()}${path.startsWith('/') ? path : `/${path}`}`, options);
};

export const scyllaNavigate = {
  navigate: navigateTo,
  goToEditPipeline,
  goToUser,
  goToAccount,
  goToSubRoute,
  goToCreatePipeline,
  goToJobs,
  goToJobDetails,
  goToTriggers,
  goToAgentDetails,
  goBack: navigateBack,
  goToProject,
  goToWorkspaceRoute,
} as const;

export type ScyllaNavigate = typeof scyllaNavigate;
