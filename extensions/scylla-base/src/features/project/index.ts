/** The list, the overview and the lookup share one cache entry through `projectQueries`. */
export type {
  ProjectEntity,
  ProjectIcon,
  ProjectIconChange,
  ProjectList,
} from './domain/entities/project.entity.ts';
export {
  CREATE_PROJECT_MUTATION_KEY,
  canListProjects,
  projectLookupQueries,
  projectMutations,
  projectQueries,
  type ProjectLookupEntry,
  PROJECT_SEARCHES_QUERY_KEY,
  PROJECTS_LOOKUP_PAGE,
  PROJECTS_QUERY_KEY,
  PROJECTS_QUERY_ROOT,
} from './presentation/project.queries.ts';
export {
  iconChangeOf as projectIconChange,
  projectIconProps,
} from './presentation/presenters/project-icon.presenter.ts';
export { keepRecentColor, recentColors } from './presentation/recent-colors.user-state.ts';
/** A loader: a barrel must not re-export a component. The icon and the name of a project page. */
export const loadProjectTitle = () => import('./presentation/ui/ProjectTitle/ProjectTitle.svelte');
// The zones of the project card: the pipelines and the repository of a project show there.
export { projectPoints, type ProjectCardContext } from './presentation/project.points.ts';
