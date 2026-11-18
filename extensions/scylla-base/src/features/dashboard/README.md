# Dashboard

> [Scylla frontend](../../../../../README.md) › `features/` › **dashboard** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

The landing page for an workspace, at `/:org/dashboard`. It answers "what is going on right
now" in one screen: how the jobs of a period went, which pipelines are red, and what runs now.
Every workspace-level redirect in the app ends here.

## A composite view, by design

The dashboard owns two things of DashboardService: the **dashboards** of a workspace and the
items of **Needs you**. A dashboard is a name, a visibility and the widgets, in order, each at a
size. Each change sends the version that the page read, so two tabs never write over each other:
the second one says so and shows the new version.

All of its data comes from other modules' public APIs:

| Question | Answered by |
|---|---|
| Which workspace am I in? | `contextStore` — [platform/context](../../platform/context/README.md) |
| How did the jobs of the period go? | `jobQueries.stats`, `jobQueries.newest` — [jobs](../jobs/README.md) |
| How are the pipelines? | `pipelineQueries.summaries` — [pipeline](../pipeline/README.md) |
| Which time zone counts the days? | `workspaceQueries.mine` — [workspace](../workspace/README.md) |
| What may this user read? | `can()` — [platform/authz](../../platform/authz/README.md) |

`createDashboardWidgets` stitches those together with the period of the page.

## Why the queries live elsewhere

It would be shorter to call `pipelineRepository.getSummaries()` from here. It
would also be wrong, and the rule exists because of a real failure: two modules querying the
same resource through different repositories produce two cache keys for one thing, and a
mutation invalidating one leaves the other stale on screen.

So the org-wide reads live in the modules that own the resource — `pipelineQueries` in
`pipeline`, `jobQueries` in `jobs` — even when the dashboard is their only consumer.
The dashboard composes; it does not fetch.

The same reasoning limits the `domain`. The layout repository holds the layouts and nothing
else: a figure never goes through it.

## What is on the page

- **No header.** The panel of the second sidebar holds the dashboards, the period (24 h, 7 d,
  14 d, or a custom range), the time zone of the workspace and the scope (all projects or
  one). The days of a period are the days of the workspace, so that two people in two
  countries see the same bars.
- **The widgets** — a sentence of what needs you, the last 24 hours, Right now, Needs you,
  Success rate, Agents, Pipelines, Runs per day and four small figures, on the grid of 8
  columns of `@scylla/ui`. The figures of a period follow the panel, and the period stays in
  the URL, so a link shows the same figures.

Access is gated on `READ_WORKSPACE` — the same permission as the projects list, because both
are reads of the workspace and this page is the redirect target for anyone landing on an org
without a deeper destination.

## Related modules

- [pipeline](../pipeline/README.md), [jobs](../jobs/README.md),
  [workspace](../workspace/README.md) — the data sources.
- [shell](../../shell/README.md) — the shell this page renders inside.
