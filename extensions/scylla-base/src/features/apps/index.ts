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
export { dailyCountsOf, type AgentStats } from './domain/structs/agent-stats.struct.ts';
/** How an agent shows in `IdentityAvatar`: the icon that an admin chose, or the default bot. */
export { agentProfile } from './presentation/presenters/agent-icon.presenter.ts';
export {
  appQueries,
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
