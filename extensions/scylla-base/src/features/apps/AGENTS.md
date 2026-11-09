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

- `presentation/apps.commands.ts`: "Create agent..." and "Create app...", for the search bar.
- An app has no shared secret. `CreateApp` and `CreateJoinCode` give a join code; the machine
  runs `scylla-agent join <server> <code>`, makes a key pair and sends the public key. The keys
  card lists the keys and revokes one.
- The roles of an app are workspace roles, given with `AccessService.Grant` (see
  `features/access`): an agent needs `runner`.
- The recent jobs of an agent come from `JobService.ListWorkspaceJobs` with its id. Its stats come
  from the server (`agent-stats.struct.ts`), for days in UTC: by default the last 30 days, or a
  period (`stats-period.struct.ts`). The server starts a period at the creation of the agent and
  keeps at most 366 days. The web uses the same limits (`periodBounds`).
- "Add agent" is a dialog in three steps (`components/AddAgentDialog/`): name and projects, install,
  connected. The install step has a tab for Linux (the default), macOS, Windows and Docker, with one
  command and one hint for each (`agent-install.struct.ts`). Linux and macOS have the same command.
  The commands name the server with `--url` or `-Url`, so the address in the command wins over the
  address in the script. The Docker tab uses the image of the server (`appQueries.server`, from
  `GetCapabilities`), replaces a loopback host with `host.docker.internal`, and has no runtime
  choice. Its choice "Run container steps" gives the socket of the machine and a warning. After one
  minute, the step shows the command of the logs of the tab. `appQueries.waiting` asks for the app
  each 2 s until a machine joined with a new key and the agent is connected (`hasJoined`). Between
  these two events, `isJoining` shows "The machine joined". With an `agent`, the dialog makes a new
  join code for it and starts at the install step. A `Button` in the form must have `type="button"`, because the
  primitive has no default type.
- The agents page (`components/AgentsList/`) shows four stat cards, filters by state
  (`agent-list.struct.ts`: a running agent is also online), a search on the name and the host name,
  and a table. The access column needs `list_workspace_members`: `appQueries.agentAccess` reads
  the roles of the workspace and of each project (`agent-access.struct.ts`). The sparkline comes
  from `appQueries.agentStats` (one call for the workspace). Disable and delete need `delete_app`;
  a new join code needs `create_app`. The other apps have their own page (`AppsList`).
- The apps page (`components/AppsList/`) is a table of the other apps. Each line reads its own
  credentials (`credentialQueries.allOf`, one query for each line) and shows the one that needs
  attention first (`mainCredential` in `app-list.struct.ts`). A user may list the apps and not
  read one of them: that query gives `null`, with no error, and the line shows a dash. The access
  column needs `list_workspace_members` (`appQueries.appRoles`).
- With no item, both pages show `components/EmptyList/`. The icon and the title have their own
  grid row, between two rows of 2fr and 3fr. The text and the button are in the 3fr row. Thus a
  longer text does not move the icon or the title, unless the text and the button are taller
  than this row. Do not center the full group: its height changes with the text.
- The agent page (`ui/AgentDetails/`, route `/agents/:appId`) shows the header (Disable or
  Enable), a banner when it is disabled, the timeline, the stats of the period, the jobs per day,
  the machine, the recent jobs, the access (Change: `runnerChanges` in
  `agent-access.struct.ts` gives the grants before the revokes; `appMutations.changeAccess` sends
  them one by one), the keys (rename, revoke, new join code) and the delete zone (type the name).
  An agent that never said hello shows a connect card with a button that makes a join code. Do not
  make the code on open: a new code stops the code of a machine that installs now. The machine card
  shows the versions and the update command when the agent and the server have different versions.
  The delete zone shows the uninstall command for the system of the agent. A Docker agent reports
  `linux`, so Linux also shows the Docker command.
- The timeline and the period: `agent-stats.state.svelte.ts` asks for two periods with
  `appQueries.agentStatsOf`: the days since the creation of the agent (the strip of
  `AgentTimeline/`), and the chosen period (the stats row and `JobsPerDayCard/`). The URL keeps the
  period: `?period=7d|90d|all`, or `?from=YYYY-MM-DD&to=YYYY-MM-DD` after a drag
  (`mappers/period-search.mapper.ts`). The default, 30 days, writes nothing. A drag changes the URL
  only at its end (`timeline-window.state.svelte.ts`). The edges of the window are sliders: an
  arrow moves one day, Shift and an arrow move 7 days. The timeline shows from the day that the
  agent joined. An agent with no ended job shows no timeline: the card shows the last 30 days and
  hatches the days before the creation of the agent. When two presets give the same period (a
  young agent), the selected preset stays the one that the user chose. A bar of the strip is
  7 px wide at most, with a gap of 2 px, as in the design: a strip with few days puts its days in
  the last columns, at the right (`stripColumns` in `presenters/agent-timeline.presenter.ts`). The
  first day and "Today" are in one row that grows to the left, so they do not overlap. The window
  is at least 28 px wide (`windowBox`), so its two handles do not cover each other. A disabled
  agent gets a hatched zone after the day that it was disabled. More than 90 days show one bar for
  each week, aligned on the last day (`presenters/jobs-chart.presenter.ts`).
  A day with 3 failed or orphaned jobs or more is an incident: a red dot on the strip.
- The page of another app (`ui/AppDetails/`, route `/apps/:appId`) shows the header (Disable or
  Enable), the workspace roles, the activity (the latest sign-in of a credential), the credentials
  (`credentialRows` in `app-credentials.struct.ts`: the tokens, the CI identities and the keys,
  with the expiry states of `@shared/domain/structs/api-token.struct.ts`), "Add a credential" and
  the delete zone. The labels of a credential come from
  `presenters/credential-labels.presenter.ts`.
- Both detail pages end with `pb-20` (80 px). The `main` of `PageTransition` is `absolute`, thus
  the shell adds no space under a page that is taller than the view. A shell overlay can float in
  the last 56 px of the view, at the right. With less space, it covers the last card.
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

- Server: `getServerInfo` (the version and the image of the agent). Anyone can read it.
- Apps: `listApps`, `getApp`, `createApp` (an agent gets `runner` on the workspace, or on each of
  `projectIds`), `deleteApp`, `disableApp`, `enableApp`. The key of a query on one app must end
  with its id: `appMutations.remove` removes these queries, because the server refuses each read
  on a deleted app and the refusal shows a toast.
- Keys and join codes: `createJoinCode`, `revokeKey`, `renameKey` (the agent names its key after
  its machine at the join).
- Agents: `listJobs`, `getAgentStats` (the last 30 days, or a period), `listAgentStats` (30 days
  for each agent). The server counts days in UTC: `domain/structs/agent-stats.struct.ts`.
- Credentials: `createToken` (the secret comes one time), `listTokens`, `revokeToken`;
  `addCiIdentity`, `listCiIdentities`, `removeCiIdentity` (`domain/entities/ci-identity.entity.ts`).
  The token types are shared with the personal tokens: `@shared/domain/structs/api-token.struct.ts`
  and `@shared/infrastructure/grpc/api-token.mapper.ts`.
