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
