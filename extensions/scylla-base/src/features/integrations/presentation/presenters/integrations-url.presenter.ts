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
