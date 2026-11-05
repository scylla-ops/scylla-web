/** The list, the overview and the lookup share one cache entry through `projectQueries`. */
export type { ProjectEntity, ProjectList } from './domain/entities/project.entity.ts';
export {
  CREATE_PROJECT_MUTATION_KEY,
  canListProjects,
  projectLookupQueries,
  projectMutations,
  projectQueries,
  type ProjectLookupEntry,
  PROJECTS_LOOKUP_PAGE,
  PROJECTS_QUERY_KEY,
  PROJECTS_QUERY_ROOT,
} from './presentation/project.queries.ts';
