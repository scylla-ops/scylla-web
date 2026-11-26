/** The parameter of `projects/new` and of its steps: the group that the form chooses first. */
const GROUP_PARAM = 'group';

/** A path with the group of the new project, e.g. `projects/new?group=g-1`. No group: the path. */
export const withNewProjectGroup = (path: string, groupId: string | undefined): string =>
  groupId ? `${path}?${GROUP_PARAM}=${encodeURIComponent(groupId)}` : path;

/** The path of the new project page in a workspace, with the group to choose first. */
export const newProjectPath = (groupId?: string): string =>
  withNewProjectGroup('projects/new', groupId);

/** The group in the query of a new project page (`?group=`), or `undefined`. */
export const newProjectGroupIn = (search: string): string | undefined =>
  new URLSearchParams(search).get(GROUP_PARAM) || undefined;
