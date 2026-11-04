# `features/apps` — agent guide

The apps of a workspace (`scylla.apps.v1.AppService`). An agent is an app that runs jobs
(`runner`); a CI or a script is an app that does not. One page shows them, with a filter.

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
