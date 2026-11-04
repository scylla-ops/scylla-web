import { currentPathname, navigateBack, navigateTo } from '@scylla/core-sdk';
import { contextStore } from './context.store.ts';
import { slugifyOrgName } from '@shared/utils/slug.ts';

/** Builds the URL from the current organization and project, read at call time. */

/** The slug of the active workspace. A context saved before the slugs has its name only. */
export const activeWorkspaceSlug = (): string | null => {
  const { slug, name } = contextStore.getState().organization;
  return slug || (name ? slugifyOrgName(name) : null);
};

const getOrgPrefix = () => {
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
  navigateTo(`${getOrgPrefix()}/projects/${id}`);
  contextStore.getState().setProject(id, name);
};

const goToCreatePipeline = () => {
  navigateTo(`${getOrgPrefix()}/projects/${contextStore.getState().project.id}/create`);
};

const goToEditPipeline = (id: string, name: string) => {
  navigateTo(`${getOrgPrefix()}/projects/${contextStore.getState().project.id}/edit/${id}`);
  contextStore.getState().setPipeline(id, name);
};

// No `name`: the caller is already inside this pipeline.
const goToJobs = (id: string, name?: string) => {
  const projectId = contextStore.getState().project.id;
  navigateTo(`${getOrgPrefix()}/projects/${projectId}/pipelines/${id}/jobs`);
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
    `${getOrgPrefix()}/projects/${projectId}/pipelines/${pipelineId}/jobs/${jobId}${query}`,
  );
  if (options.pipelineName)
    contextStore.getState().setPipeline(pipelineId, options.pipelineName);
};

const goToTriggers = (id: string, name: string) => {
  const projectId = contextStore.getState().project.id;
  navigateTo(`${getOrgPrefix()}/projects/${projectId}/pipelines/${id}/triggers`);
  contextStore.getState().setPipeline(id, name);
};

const goToUser = (userId: string) => {
  navigateTo(`${getOrgPrefix()}/users/${userId}`);
};

/** The account of the session. */
const goToAccount = () => {
  navigateTo(`${getOrgPrefix()}/account`);
};

/** The URL of a page of any workspace, the active one or not, from its slug. */
export const organizationUrl = (slug: string, path = 'projects'): string => `/${slug}/${path}`;

const goToAgentDetails = (agentId: string) => {
  navigateTo(`${getOrgPrefix()}/agents/${agentId}`);
};

const goToOrgRoute = (path: string) => {
  navigateTo(`${getOrgPrefix()}${path.startsWith('/') ? path : `/${path}`}`);
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
  goToOrgRoute,
} as const;

export type ScyllaNavigate = typeof scyllaNavigate;
