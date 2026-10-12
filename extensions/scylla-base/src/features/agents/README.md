# Agents

> [Scylla frontend](../../../../../README.md) › `features/` › **agents** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

Build agents are the machines that connect to Scylla, take the jobs of an organization and run
the pipeline steps. This module shows which agents exist, what they do now, how their jobs went,
where they take jobs, and with which secrets they sign in.

## What it covers

- **The agent list** (`/:org/agents`). A summary (online, running now, needs attention, jobs of
  the last 30 days), a filter by state, a search by name or host, and one row for each agent:
  its host, its access, a 30-day sparkline and its activity.
- **The agent page** (`/:org/agents/:agentId`). The state, the key numbers, the jobs per day,
  the recent jobs, the host, the access, the secrets, and the delete action.
- **The actions.** Create an agent in a dialog of two steps (a name and where it takes jobs,
  then the secret, the command to start it and a live status until it connects), reset its
  secret with a new name, rename a secret, disable or enable it, delete it. The new agent dialog
  does not show the name of the first secret: CE gives it the agent name. The reset is the only
  way to get a secret again. The suggested name of a new secret is the machine name.
  On the agent page, a user who manages the grants of the organization gives the agent one
  project or all the projects, and removes an access.
- **The empty state.** `NoAgentsBanner` tells the `jobs` page that queued jobs wait for an
  agent.

The list needs `LIST_AGENTS` and the agent page needs `READ_APP`. Each action checks its own
permission.

## How it is built

**Domain** holds `AgentEntity` and the structs around it (`AgentStats`, `DailyOutcome`,
`CreatedAgent`). Two pure files hold the rules: `agentStateOf` gives the one state of an agent
(idle, running, offline, never connected, disabled), and `summarizeAgents` gives the numbers of
the summary. A component shows a state; it does not calculate one.

**Infrastructure** implements `AgentsRepository` over `AgentAdminService`. It also asks
`JobService` for the recent jobs of an agent and `PipelineService` for their names. These calls
are here because `jobs` and `pipeline` import this module: an import back would make a cycle.

**An agent is an app.** The secrets, the grants and the enable flag are `AppService` calls, and
the `apps` module owns them. This module uses them through the `apps` barrel, so each resource
has one query key. The reset is a use case of `apps` (`ResetAppSecretUseCase`): it creates the
new secret, then revokes the old ones when the user asks for it. The project names of the recent
jobs come from `project`. A new agent limited to one project gets a `project-agent` grant through
`roles`, then loses the `organization-agent` grant that `CreateAgent` gave it. The "Access"
card uses the same grant calls. "All projects" creates the organization grant before it revokes
the project grants: if a revoke fails, the agent keeps more access, never less.

**Presentation** has one ViewModel for each page, one for the actions that both pages share,
and one for the reset dialog. The new secret stays in the state of that dialog only, and goes
away when the dialog closes.

**The bot** (`AgentBot`) shows the state with a small animation in CSS: it breathes when idle,
hops when it runs a job, sleeps when offline, looks for a signal when it never connected, and
stays low when disabled. With reduced motion, it keeps a static pose.

## Related modules

- [apps](../apps/README.md): the app behind each agent, its secrets and its grants.
- [jobs](../jobs/README.md): what agents run. Its page shows `NoAgentsBanner`.
- [dashboard](../dashboard/README.md): an outcomes chart for one agent at a time.
- [onboarding](../onboarding/README.md): the tour creates the first agent and points at its page.
- [platform/authz](../../platform/authz/README.md): the permission checks.
