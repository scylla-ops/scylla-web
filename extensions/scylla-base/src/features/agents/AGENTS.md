# `features/agents`: agent guide

Build agents: the machines that take the jobs of an organization and run them. This module
shows their state, their statistics, their access and their secrets.

**Layer** `features/` · **id** `agents` · **DI key** `agentsRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API: `index.ts`

```typescript
type AgentEntity
type AgentStats, CreatedAgent, DailyOutcome
agentQueries, agentMutations
AGENTS_QUERY_KEY, AGENT_QUERY_KEY, AGENT_STATS_QUERY_KEY
CREATE_AGENT_MUTATION_KEY   // the key of agentMutations.create; onboarding follows it
loadNoAgentsBanner          // a loader of NoAgentsBanner, for `jobs`
```

Never add to this barrel: `agents.module.ts`, pages, a `.svelte` component.

`agentQueries.byOrganization` calculates its `enabled` from `can(LIST_AGENTS)`, and
`agentQueries.statsOf` from `can(READ_APP_STATS)`. Make the options in the `createQuery`
callback, so that `can` stays reactive.

## Data contract

`AgentsRepository`: `domain/repository/agents.repository.ts`.

| Method | Returns |
|---|---|
| `listAgents(organizationId)` | `AgentEntity[]` |
| `getAgent(agentId)` | `AgentEntity` |
| `getAgentStats(agentId)` | `AgentStats` |
| `createAgent(organizationId, name)` | `CreatedAgent` (the secret, one time) |
| `deleteAgent(agentId)` | `void` |
| `listJobs(organizationId, agentId, limit)` | `AgentJob[]`: `ListOrganizationJobs` with `agent_id`, first page |
| `listPipelineNames(organizationId)` | `PipelineName[]`: `ListOrganizationPipelines`, for the names of a job |

All of them return a `ScyllaResult`. Only `agents.queries.ts` uses the repository.

**`listJobs` and `listPipelineNames` are here, not in `jobs` and `pipeline`.** `jobs` (the
`NoAgentsBanner`) and `pipeline` (the run toast) import this module. If this module imports them
back, the module graph has a cycle, and `pnpm depcruise:cycles` fails. Thus this module asks
`JobService` and `PipelineService` itself. `GrpcAgentMapper.jobToDomain` gives the status names
of `jobs`.

An agent is an app. The other calls go through the barrels of the features that own them:

| From | Used for |
|---|---|
| `features/apps` | `appQueries.secretsOf`, `appQueries.accessOf` (`ListAppAccess`), `appMutations.resetSecret`, `revokeSecret`, `setSecretEnabled`, `setSecretLabel`, `setActive`; `suggestSecretLabel`, `secretLabelProblem`, `trimSecretLabel` |
| `features/project` | `projectQueries.lookup`, `canListProjects`: the project names of the recent jobs, and the projects of the new agent dialog and of the give access dialog |
| `features/roles` | `grantMutations.create`, `grantMutations.revoke`, `roleQueries.scopedGrants`: a new agent limited to one project, and the access edits of the agent page |

`agentMutations.setActive` is `appMutations.setActive` that also invalidates the agent entries.
`agentQueries.recentJobsOf` checks `LIST_JOBS_BY_ORGANIZATION`; `agentQueries.pipelineNames`
checks `LIST_PIPELINES_BY_ORGANIZATION` and runs only once a job shows.

## Layout

```
agents.module.ts                       routes + nav + DI wiring (private; registry only)
index.ts                               public API
domain/
  entities/agent.entity.ts             AgentEntity, AgentHost
  structs/agent.struct.ts              AgentStats, CreatedAgent, DailyOutcome
  structs/agent-job.struct.ts          AgentJob, PipelineName
  structs/agent-state.struct.ts        AgentState, agentStateOf, isOnline (pure)
  structs/agents-summary.struct.ts     sumOutcomes, successRateOf, summarizeAgents (pure)
  repository/agents.repository.ts      the contract
infrastructure/
  default-agents.repository.ts         AgentAdmin, Job, Pipeline clients → domain types
  grpc-agent.mapper.ts                 GrpcAgentMapper (agents, stats, jobs)
presentation/
  agents.queries.ts                    the reads and writes of this module
  utils/agent-format.ts                short id, durations, memory, percent, dates
  ui/agents.messages.ts                the strings that both pages show
  ui/Agents/                           the list page and its private parts
    agents-page.state.svelte.ts        ViewModel of the list: rows, filter, search, summary
  ui/AgentDetails/                     the detail page and its private cards
    agent-details.state.svelte.ts      ViewModel of the detail page
  ui/AgentDetails/AccessCard/          the access card, its give and remove dialogs
    agent-access.state.svelte.ts       the access card of the agent page: give, replace, remove
    access.calculator.ts               grant order, project labels, where the agent takes jobs,
                                       the projects without a grant, the grants that "All projects"
                                       replaces, keepsCover (pure)
    take-focus.attachments.svelte.ts   focuses a node on request (the card heading, after a remove)
  ui/components/AgentBot/              the animated bot tile
  ui/components/CreateAgentDialog/     the new agent dialog: name and access, then start the agent
    create-agent.state.svelte.ts       the two steps of a new agent: create, grants, live status
    track-height.attachments.ts        reports the height of a node (the dialog body animates on it)
  ui/components/AgentRunCommand/       address, way to run, and the command (dialog step 2, agent page)
    run-command.calculator.ts          the Docker, Docker Compose and source commands; AGENT_IMAGE
  ui/components/CopyBox/               a value with a copy button
  ui/components/ResetSecretDialog/     name and confirm, then show the new secret one time
    reset-secret.state.svelte.ts       the two steps of a reset, resetOutcomeOf
  ui/components/RenameSecretDialog/    rename one secret (the "Rename" item of the Secrets card)
    rename-secret.state.svelte.ts      the rename of one secret
  ui/components/SecretLabelField/      the secret name field and its errors (reset, rename)
    secret-label-input.state.svelte.ts a secret name field: suggestion, edit, CE rules, refusal
  ui/components/DisableAgentDialog/    confirm a disable
  ui/components/agent-actions.state.svelte.ts   the actions on one agent and their dialogs, for both pages
  ui/components/daily-outcomes.calculator.ts    30 days, zero-filled; axis top (pure)
  ui/components/AgentActionsMenu.svelte, AgentActionDialogs.svelte, AgentStateDot.svelte
  ui/components/DialogFooterBand.svelte, AlertDialogCloseButton.svelte   the parts of the dialog layout
  ui/components/AgentIdLink/           the id with a copy button
  ui/components/NoAgentsBanner.svelte  for `jobs`, through `loadNoAgentsBanner`
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `organization` | `agents` (index) | `LIST_AGENTS` | `Agents.page.svelte` |
| `organization` | `agents/:agentId` | `READ_APP` | `AgentDetails.page.svelte` |

The detail page gets `agentId` as a **prop**. Sidebar: section `organization`, order `40`,
icon `HardDriveIcon`, same permission.

## Rules that bite here

- **Every agent dialog has one layout**: a header (title, description, the X at the top right),
  a body, then `DialogFooterBand` (a note on the left, the actions on the right). The three
  parts carry `data-dialog-part` and start on the same left edge (24 px). Do not add an icon
  column. An alert dialog has no X of its own: `AlertDialogCloseButton` adds it. Do not put a
  `slide-in-from-*` class on the centered content: animate an inner element.
- **The new agent dialog has two steps.** Step 1 calls `CreateAgent`, which grants
  `organization-agent` on the organization. With "One project", a `project-agent` grant on the
  project follows, then the `organization-agent` grant of the new app goes (found with
  `ListGrants` on the organization). This option shows only with `MANAGE_ORG_GRANTS` (for
  `ListGrants` and `RevokeGrant` of the organization grant) and at least one project with
  `MANAGE_PROJECT_GRANTS` (for the project grant). The select lists only these projects.
  While the project list loads, "One project" shows a loading line and "Create agent" is
  disabled; a failed list shows an error with a retry, and the user must choose an option. A
  failed grant step does not stop the flow: step 2 shows the secret and a
  warning, which sends the user to the "Access" card of the agent page. Step 2 polls `GetAgent` every 2 s (with `READ_APP`) until the agent connected. The poll stops
  on an error (`liveStatusInterval`): each failed refetch shows a toast.
- **The move between the steps has two phases.** The button shows "Created" and the first dot
  turns into a check for `VALIDATION_MS` (700 ms), then the steps slide (450 ms) and the body
  height follows the measured height of the new step. With reduced motion there is no pause
  and only a short fade. While the agent is created (phases `creating` and `created`), nothing
  closes the dialog: no X, no Escape, no click outside. In step 2, only its buttons close it.
  `CreateAgentFlow` exports `dismissible()`, and `CreateAgentDialog` reads it through
  `bind:this`. Svelte sets the binding to `null` when the flow goes, thus a creation that ends
  after a close changes nothing. Do not ignore a close request in `onOpenChange`: bits-ui
  closes its own copy of `open` first, and the dialog then shows closed while its parent keeps
  `open`. The secret goes with the dialog: the flow is built again at each opening, and
  `agentMutations.create` has `gcTime: 0`.
- **Step 2 must not be wider than the body.** The step grid is `grid-cols-1`
  (`minmax(0, 1fr)`) and each step has `min-w-0`, else the auto column takes the min-content
  width of the commands. The body is `overflow-clip`, thus a focus cannot scroll it. A command
  scrolls in its own box (`CopyBox layout="lines"`: `overflow-x-auto`, `contain-inline-size`);
  the secret wraps (`break-all`). When the Create button goes, bits-ui focuses the first
  tabbable element with a plain `focus()`. Thus step 2 focuses the copy button of the secret
  first, with `preventScroll` (`CopyBox focusOnMount`).
- **The commands follow `binaries/scylla-agent`**: the flags `--control-plane-url`, `--app-id`,
  `--app-secret`, `--workspace-root`, and the variables `SCYLLA_CONTROL_PLANE_URL`,
  `SCYLLA_APP_ID`, `SCYLLA_APP_SECRET`. `AGENT_IMAGE` pins the image tag: change it with each
  release.

- **The state of an agent comes from `agentStateOf` only.** The order is: disabled
  (`isActive` false), never connected (`lastSeen` empty), offline (not `connected`), running
  (`inFlight` above 0), idle. Do not calculate a state in a component.
- **Each action has its permission.** Reset secret: `DELETE_APP` and `READ_APP`. Disable,
  enable, delete, the secret actions: `DELETE_APP`. Stats and the "Key numbers":
  `READ_APP_STATS`. Recent jobs: `LIST_JOBS_BY_ORGANIZATION` (the card is hidden without it).
  Create: `CREATE_AGENT`. `agent-actions.state.svelte.ts` holds these checks for both pages.
- **When an agent goes, take it out of the cached list and remove its own entries before the
  refetch.** Else, until the refetch of `ListAgents` comes back, its row asks CE about it again
  (`GetAgentStats`, `ListAppAccess`), and the global handler shows "App '<id>' not found".
  `agentMutations.remove` cancels the list and the entries of the agent, removes the agent from
  `AGENTS_QUERY_KEY`, removes its entries (agent, stats, jobs, and the app, secrets and access
  keys of `features/apps`), then invalidates the list. This `onSuccess` runs before the
  `onSuccess` of the caller, which goes back to the list.
- **The reset is the only way to get a secret again.** "Show the run command" on an agent that
  never connected opens it. `ResetAppSecretUseCase` (`features/apps`) lists the secrets,
  creates the secret with the name of the field, then revokes the others when the box is
  checked. A failed revoke does not hide the new secret.
- **The name of a secret comes from `suggestSecretLabel` (`features/apps`) only.** The new agent
  dialog has no secret name field: `CreateAgent` gets no `secret_label`, and CE gives the first
  secret the agent name, normalized (the same rule). The reset dialog suggests the last hostname of the agent (`host.hostname` of `GetAgent`),
  else the agent name. A taken name gets `-2`, `-3`. The field shows an error only after an
  edit, or after CE refused the name (`ALREADY_EXISTS`). Then the field takes the focus back.
  "Rename" in the Secrets card needs the same permission as the other secret actions. Trim a
  name with `trimSecretLabel`, not with JS `trim()`: the web then checks the name that it sends.
- **The new secret lives in `$state` of `reset-secret.state.svelte.ts` only.** `clear` sets it
  to `null` and resets the mutation, and the mutation has `gcTime: 0`. Do not log it, do not
  put it in a store or in a query.
- **A new secret shows in one place, masked by default. Copy gives the real value.** Give the
  secret to `CopyBox` (`secret`): it shows one bullet for each character, and the real value is
  not in the DOM until the user clicks the eye button. In step 2 of the new agent dialog, the
  commands also mask it, and the eye button of the secret box shows or hides it in all of them.
  The name of the eye button is always "Show the secret": `aria-pressed` gives the state (WAI-ARIA
  APG). The copy button stays the first button of the box: the tour waits for a click on it.
- **A connected agent shows "Connected", not "Seen …".** `last_seen` moves only on events
  (connect, hello, job status), thus it is old for an agent that stays connected. Only an
  offline agent shows "Last seen <relative>". An agent that never connected shows no seen text.
- **The list asks one `GetAgentStats` and one `ListAppAccess` per agent** (`createQueries`).
  The list and the agent poll every 10 s (`LIVE`), the recent jobs too. A `createNow` tick of
  30 s moves the relative times on without a refetch.
- **The tile "Finished jobs, last 30 days" never shows a partial sum.** It waits while a stats
  query loads. When a stats query fails, it shows the sum with "Partial: N agents not counted".
  It counts the completed, failed, cancelled and orphaned jobs only.
- **`ListAppAccess` can return grants on other organizations.** `access.calculator.ts` compares
  `organizationId` with the organization on screen: the first badge prefers a grant of this
  organization, and a grant of another organization names its organization ("All projects of
  <org>", "<org> / <project>"). "Every project of this organization" is for this organization
  only.
- **The project names of the recent jobs need `canListProjects`.** Without it, a row shows the
  pipeline name alone, and there is no call and no denial toast.
- **`AgentBot` has its motion in its own `<style>`.** One loop per state, 2.4 s. The joints use
  `transform-box: view-box` with an origin in viewBox units; the eyes use `fill-box`. The block
  `prefers-reduced-motion: reduce` stops every animation and keeps the static pose. The test
  config has `css: false`, thus the rendered tile has no styles: `AgentBot.test.ts` compiles the
  source (`?raw` and `svelte/compiler`) and checks the compiled CSS.
- **A disabled agent dims its cells, not the actions cell**: the menu stays usable.
- **New strings go in a `*.messages.ts`, never in a `.svelte`.** Extraction does not read
  components. The French catalog must stay complete; `ui/__test__/agents.messages.fr.test.ts`
  checks the plural forms.
- A bits-ui menu is in a floating layer that jsdom hides: get its items with `findFloating`
  from `test/render.svelte.ts`, not with `getByRole`.
- `NoAgentsBanner` goes out as a loader, because a barrel must not export a component.
- **`data-tour` attributes are anchors of the onboarding tour**: `agents` on the list page,
  `agent-details` on the detail page, `agent-status` with `data-online` on the header, and
  `agent-run` on the "Run this agent" card. That card shows only while the agent never
  connected, which is the state of the agent that the tour creates. In the new agent dialog:
  `agent-secret` (the secret box, its copy button), `agent-run-command` and
  `agent-dialog-actions` (the step 2 footer). Step 1 must stay a `<form>`. The "New agent"
  button must stay the `onNew` of `FeatureHeader` (`data-part="feature-header-new"`). See
  [`features/onboarding`](../onboarding/AGENTS.md#anchors).
- **The "Access" card changes the grants of the agent. Each grant has its permission**, as in
  CE: a project grant needs `MANAGE_PROJECT_GRANTS` on its project, the organization grant
  `MANAGE_ORG_GRANTS` (`MANAGE_ORG_GRANTS` does not reach a project grant). The X of a row
  follows this rule; a system grant has no X. "Add access" shows when the user can give the
  organization grant or one project. The project select lists only the projects without a
  grant that the user may give. "All projects" needs `MANAGE_ORG_GRANTS`. It creates the
  `organization-agent` grant first, then revokes the project grants of this organization that
  the user may revoke. The dialog names the project access that stay. A failed revoke keeps the
  new grant and shows a warning toast. With the organization grant (or a system grant), "Add
  access" is `aria-disabled` with a tooltip.
- **The give dialog never chooses "All projects" because the project list is empty.** While
  the list loads, "One project" shows a loading line and Give is disabled. A failed list shows
  an error with a retry. Without `LIST_PROJECTS_BY_ORGANIZATION` the dialog says so. In these
  cases no option is chosen, and the user must choose "All projects". `projectQueries.lookup`
  asks 100 projects (`PROJECTS_LOOKUP_PAGE`). The project feature has no search, thus the
  dialog says when the list is cut.
- **A revoke closes the stream of the agent** (CE `registry.disconnect`). The agent connects
  again after about 3 s, and its running job continues. CE checks the grants on each job status
  and log frame: when no other grant covers the job (`keepsCover`), the job cannot report its
  result and stays running. The remove dialog and the replacement text say this.
- **After each change, `agent-access.state.svelte.ts` invalidates `APP_ACCESS_QUERY_KEY` of the
  app**: the agent page and `AccessBadges` of the list read this entry. A failed call keeps the
  dialog open: the global handler shows the server message. A failed `ListAppAccess` shows an
  error with a retry, not a skeleton. The new row has a primary tint for `HIGHLIGHT_MS`; its key
  has the scope and the role, as CE keeps one grant per principal, role and scope. After a
  remove, the X that opened the dialog is gone: `returnFocus` (`onCloseAutoFocus`) gives the
  focus to the card heading. After "All projects", the focus goes back to "Add access", because
  a denied `GatedButton` stays the same focusable element.
- There is no jobs page for an organization, thus the recent jobs have no "All jobs" link.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles &&
pnpm i18n:collisions`: all clean. New strings: `pnpm extract && pnpm compile`.
