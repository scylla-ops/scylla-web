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
export type { ProjectGroupEntity } from './domain/entities/project-group.entity.ts';
/** The group of a new project: the forms of a new project choose it, and the creation sets it. */
export {
  groupChoiceComplete,
  groupChoiceOf,
  type ProjectGroupChoice,
} from './domain/entities/project-group.entity.ts';
export {
  newProjectGroupIn,
  newProjectPath,
  withNewProjectGroup,
} from './presentation/presenters/new-project.presenter.ts';
/** A loader: the field « Group » of a project form. */
export const loadGroupField = () => import('./presentation/ui/GroupField/GroupField.svelte');
export { projectGroupQueries } from './presentation/project-group.queries.ts';
/** The pins and the closed sections of the person: the projects page and the sidebar share them. */
export { closedSections, projectPins } from './presentation/project-layout.user-state.ts';
export { PINS, UNGROUPED } from './presentation/presenters/project-sections.presenter.ts';
/** A loader: a barrel must not re-export a component. The icon and the name of a project page. */
export const loadProjectTitle = () => import('./presentation/ui/ProjectTitle/ProjectTitle.svelte');
// The zones of the project card: the pipelines and the repository of a project show there.
export { projectPoints, type ProjectCardContext } from './presentation/project.points.ts';
