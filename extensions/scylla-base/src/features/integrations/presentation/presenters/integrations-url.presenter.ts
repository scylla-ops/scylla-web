/** The query parameter that the GitHub callback adds after a new connection. */
const CONNECTED_PARAM = 'connected';

/** The Integrations page of a workspace, with the connection that the callback just made. */
export const integrationsUrl = (workspaceSlug: string, connectedId?: string): string => {
  const path = `/${workspaceSlug}/settings/integrations`;
  return connectedId ? `${path}?${CONNECTED_PARAM}=${encodeURIComponent(connectedId)}` : path;
};

/** The connection that the callback just made, from the query string of the page. */
export const connectedIdIn = (search: string): string =>
  new URLSearchParams(search).get(CONNECTED_PARAM) ?? '';

/** The page of the Git provider App of the server, under a workspace. */
export const gitProvidersUrl = (workspaceSlug: string): string =>
  `/${workspaceSlug}/instance/git-providers`;

/** The query parameter of the connection to show first on the page of a new project. */
const CONNECTION_PARAM = 'connection';

/** The page of a new project linked to a GitHub repository. */
export const newGitHubProjectUrl = (workspaceSlug: string): string =>
  `/${workspaceSlug}/projects/new/github`;

/** A page that started a GitHub install, with the connection that the install made. */
export const withConnection = (path: string, connectionId: string): string => {
  const [base, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.set(CONNECTION_PARAM, connectionId);
  return `${base}?${params.toString()}`;
};

/** The connection to show first, from the query string of the page. */
export const connectionIdIn = (search: string): string =>
  new URLSearchParams(search).get(CONNECTION_PARAM) ?? '';

/** The repository settings of a project. */
export const repositorySettingsUrl = (workspaceSlug: string, projectId: string): string =>
  `/${workspaceSlug}/projects/${projectId}/settings/repository`;
