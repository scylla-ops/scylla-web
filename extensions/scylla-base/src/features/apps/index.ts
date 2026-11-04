/** The apps of a workspace; an agent is an app that runs jobs. Each read checks itself. */
export type {
  AppEntity,
  AppHost,
  AppJob,
  AppKeyEntity,
  AppState,
  CreatedApp,
  JoinCode,
} from './domain/entities/app.entity.ts';
export { appStateOf } from './domain/entities/app.entity.ts';
export { appStatsOf, type AppStats } from './domain/structs/app-stats.struct.ts';
export {
  appQueries,
  appMutations,
  APPS_QUERY_ROOT,
  APPS_QUERY_KEY,
  APP_QUERY_KEY,
  type AppFilter,
} from './presentation/apps.queries.ts';
/** A loader: a barrel must not re-export a component. */
export const loadNoAgentsBanner = () =>
  import('./presentation/ui/components/NoAgentsBanner/NoAgentsBanner.svelte');
