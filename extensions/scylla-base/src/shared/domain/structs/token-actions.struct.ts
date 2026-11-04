import type { TokenExpiry, TokenLimits, TokenPreset } from './api-token.struct.ts';

export type ActionGroupId = 'projects' | 'pipelines' | 'jobs' | 'secrets' | 'triggers' | 'apps';
export type ActionId = 'read' | 'change' | 'run' | 'cancel' | 'logs' | 'manage';

/** One box of the advanced limits: some methods of the API, `<package>.<Service>/<Method>`. */
export interface TokenAction {
  id: ActionId;
  methods: readonly string[];
}

export interface ActionGroup {
  id: ActionGroupId;
  actions: readonly TokenAction[];
}

/** `<group>.<action>`, for example `pipelines.run`. */
export type ActionKey = `${ActionGroupId}.${ActionId}`;

const projects = 'scylla.projects.v1.ProjectService/';
const secrets = 'scylla.projects.v1.SecretService/';
const pipelines = 'scylla.pipelines.v1.PipelineService/';
const jobs = 'scylla.pipelines.v1.JobService/';
const triggers = 'scylla.pipelines.v1.TriggerService/';
const apps = 'scylla.apps.v1.AppService/';

const of = (service: string, names: readonly string[]) => names.map(name => service + name);

export const ACTION_GROUPS: readonly ActionGroup[] = [
  {
    id: 'projects',
    actions: [
      { id: 'read', methods: of(projects, ['GetProject', 'ListProjects']) },
      { id: 'change', methods: of(projects, ['CreateProject', 'UpdateProject', 'DeleteProject']) },
    ],
  },
  {
    id: 'pipelines',
    actions: [
      {
        id: 'read',
        methods: of(pipelines, ['GetPipeline', 'ListProjectPipelines', 'ListWorkspacePipelines']),
      },
      {
        id: 'change',
        methods: of(pipelines, ['CreatePipeline', 'UpdatePipeline', 'DeletePipeline']),
      },
      { id: 'run', methods: of(pipelines, ['RunPipeline']) },
    ],
  },
  {
    id: 'jobs',
    actions: [
      { id: 'read', methods: of(jobs, ['GetJob', 'ListPipelineJobs', 'ListWorkspaceJobs']) },
      { id: 'cancel', methods: of(jobs, ['CancelJob', 'RerunJob']) },
      { id: 'logs', methods: of(jobs, ['TailJobLogs']) },
    ],
  },
  {
    id: 'secrets',
    actions: [
      { id: 'read', methods: of(secrets, ['ListSecrets']) },
      { id: 'change', methods: of(secrets, ['CreateSecret', 'UpdateSecret', 'DeleteSecret']) },
    ],
  },
  {
    id: 'triggers',
    actions: [
      { id: 'read', methods: of(triggers, ['GetTrigger', 'ListPipelineTriggers']) },
      {
        id: 'change',
        methods: of(triggers, [
          'CreateTrigger',
          'UpdateTrigger',
          'DeleteTrigger',
          'SetTriggerEnabled',
          'FireTriggerNow',
        ]),
      },
    ],
  },
  {
    id: 'apps',
    actions: [
      {
        id: 'read',
        methods: of(apps, ['GetApp', 'ListApps', 'ListAppTokens', 'ListCiIdentities']),
      },
      {
        id: 'manage',
        methods: of(apps, [
          'CreateApp',
          'DeleteApp',
          'DisableApp',
          'EnableApp',
          'CreateJoinCode',
          'RevokeAppKey',
          'RenameAppKey',
          'CreateAppToken',
          'RevokeAppToken',
          'AddCiIdentity',
          'RemoveCiIdentity',
        ]),
      },
    ],
  },
];

export const actionKey = (group: ActionGroupId, action: ActionId): ActionKey =>
  `${group}.${action}`;

const ALL_KEYS: ActionKey[] = ACTION_GROUPS.flatMap(group =>
  group.actions.map(action => actionKey(group.id, action.id)),
);

const READ_KEYS: ActionKey[] = [
  ...ACTION_GROUPS.map(group => actionKey(group.id, 'read')),
  'jobs.logs',
];

/** The boxes that each preset checks. `full` checks each box. */
export const presetKeys = (preset: Exclude<TokenPreset, 'custom'>): ActionKey[] => {
  if (preset === 'full') return ALL_KEYS;
  if (preset === 'read_only') return READ_KEYS;
  return [...READ_KEYS, 'pipelines.run', 'jobs.cancel'];
};

/** The methods of the checked boxes, in a stable order. */
export const methodsOf = (keys: readonly ActionKey[]): string[] =>
  ACTION_GROUPS.flatMap(group =>
    group.actions
      .filter(action => keys.includes(actionKey(group.id, action.id)))
      .flatMap(action => action.methods),
  );

/** The boxes of a custom list: a box is checked when each of its methods is in the list. */
export const keysOf = (methods: readonly string[]): ActionKey[] =>
  ACTION_GROUPS.flatMap(group =>
    group.actions
      .filter(action => action.methods.every(method => methods.includes(method)))
      .map(action => actionKey(group.id, action.id)),
  );

/** The limits of a form: a preset, or the boxes that the user checked (`custom`). */
export const limitsOf = (
  preset: TokenPreset,
  keys: readonly ActionKey[],
  projectIds: readonly string[],
): TokenLimits => ({
  preset,
  actions: preset === 'custom' ? methodsOf(keys) : [],
  projectIds: [...projectIds],
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** The end of a new token that the user makes at `now`. */
export const expiryDateOf = (expiry: TokenExpiry, now: Date): Date =>
  new Date(now.getTime() + expiry * DAY_MS);

export const TOKEN_EXPIRIES: readonly TokenExpiry[] = [7, 30, 90, 365];
export const DEFAULT_EXPIRY: TokenExpiry = 90;
