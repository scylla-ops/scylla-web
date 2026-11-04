# `features/apps` — agent guide

The apps of a workspace (`scylla.apps.v1.AppService`). An agent is an app that runs jobs
(`runner`); a CI or a script is an app that does not. Two pages list them: `agents` and `apps`,
under the folding item "Machines" of the sidebar (a `NavGroup`).

**Layer** `features/` · **id** `apps` · **DI keys** `appsRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## What it does

- An app has no shared secret. `CreateApp` and `CreateJoinCode` give a join code; the machine
  runs `scylla-agent join <server> <code>`, makes a key pair and sends the public key. The keys
  card lists the keys and revokes one.
- The roles of an app are workspace roles, given with `AccessService.Grant` (see
  `features/access`): an agent needs `runner`.
- The recent jobs of an agent come from `JobService.ListWorkspaceJobs` with its id; its stats are
  computed from them (`app-stats.struct.ts`).
- "Add agent" is a dialog in three steps (`components/AddAgentDialog/`): name and projects, install,
  connected. The install step shows one command for each OS (`agent-install.struct.ts`) and
  `appQueries.waiting` asks for the app each 2 s until a machine joined with a new key and the
  agent is connected (`hasJoined`). With an `agent`, the dialog makes a new join code for it and
  starts at the install step. A `Button` in the form must have `type="button"`, because the
  primitive has no default type.
- The agents page (`components/AgentsList/`) shows four stat cards, filters by state
  (`agent-list.struct.ts`: a running agent is also online), a search on the name and the host name,
  and a table. The access column needs `list_workspace_members`: `appQueries.agentAccess` reads
  the roles of the workspace and of each project (`agent-access.struct.ts`). The sparkline comes
  from `appQueries.agentStats` (one call for the workspace). Disable and delete need `delete_app`;
  a new join code needs `create_app`. The other apps have their own page (`AppsList`).
- The agent page (`ui/AgentDetails/`, route `/agents/:appId`) shows the header (Disable or
  Enable), a banner when it is disabled, the 30-day stats (`appQueries.agentStatsOf`), the jobs per
  day, the machine, the recent jobs, the access (Change: `runnerChanges` in
  `agent-access.struct.ts` gives the grants before the revokes; `appMutations.changeAccess` sends
  them one by one), the keys (rename, revoke, new join code) and the delete zone (type the name).
  An agent that never said hello shows a connect card with a join code made on open.
- The page of another app (`ui/AppDetails/`, route `/apps/:appId`) shows the header (Disable or
  Enable), the workspace roles, the activity (the latest sign-in of a credential), the credentials
  (`credentialRows` in `app-credentials.struct.ts`: the tokens, the CI identities and the keys,
  with the expiry states of `@shared/domain/structs/api-token.struct.ts`), "Add a credential" and
  the delete zone. The labels of a credential come from
  `presenters/credential-labels.presenter.ts`.
- "Add an app" (`components/AddAppDialog/`) has three steps: name and roles (`grantsOf`), the
  connection (API token, CI identity or key pair), and the credential.
  `credentialMutations.createApp` makes the app, gives its roles, then makes the credential; a
  key pair gets the join code of the new app at the end of step 2. The token form is shared
  (`@shared/presentation/ui` `TokenForm`, `@shared/domain/structs/token-actions.struct.ts`: the
  boxes of the advanced limits and the presets). A CI identity gets the preset `full`: its roles
  bound it. `ci-ref.struct.ts` writes a GitHub branch as `refs/heads/<name>`, because the server
  compares the `ref` claim as it is. The code samples (`app-snippets.struct.ts`) call the JSON
  gateway `POST /api/<package>.<Service>/<Method>`.
- `appQueries.runners` and `loadNoAgentsBanner` serve the pipelines and the jobs: they warn when
  jobs wait and no agent is connected.

## Repository (`appsRepository`)

- Apps: `listApps`, `getApp`, `createApp` (an agent gets `runner` on the workspace, or on each of
  `projectIds`), `deleteApp`, `disableApp`, `enableApp`.
- Keys and join codes: `createJoinCode`, `revokeKey`, `renameKey` (the agent names its key after
  its machine at the join).
- Agents: `listJobs`, `getAgentStats`, `listAgentStats` (the server counts 30 days in UTC:
  `domain/structs/agent-stats.struct.ts`).
- Credentials: `createToken` (the secret comes one time), `listTokens`, `revokeToken`;
  `addCiIdentity`, `listCiIdentities`, `removeCiIdentity` (`domain/entities/ci-identity.entity.ts`).
  The token types are shared with the personal tokens: `@shared/domain/structs/api-token.struct.ts`
  and `@shared/infrastructure/grpc/api-token.mapper.ts`.
