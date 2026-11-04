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
export {
  appStatsOf,
  dailyOutcomesOf,
  type AppStats,
  type DailyOutcome,
} from './domain/structs/app-stats.struct.ts';
export {
  appQueries,
  appStatsQueries,
  appMutations,
  APPS_QUERY_ROOT,
  APPS_QUERY_KEY,
  APP_QUERY_KEY,
  CREATE_APP_MUTATION_KEY,
  type AppFilter,
} from './presentation/apps.queries.ts';
/** A loader: a barrel must not re-export a component. */
export const loadNoAgentsBanner = () =>
  import('./presentation/ui/components/NoAgentsBanner/NoAgentsBanner.svelte');
