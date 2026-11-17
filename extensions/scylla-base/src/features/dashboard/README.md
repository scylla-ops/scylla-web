# Dashboard

> [Scylla frontend](../../../../../README.md) › `features/` › **dashboard** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

The landing page for an workspace, at `/:org/dashboard`. It answers "what is going on right
now" in one screen: how the jobs of a period went, which pipelines are red, and what runs now.
Every workspace-level redirect in the app ends here.

## A composite view, by design

The dashboard owns one thing: the **layouts** of the dashboards of a workspace. A layout is a
name and the widgets, in order, each at a size. The browser keeps the layouts
(`localStorage`) behind `DashboardLayoutRepository`, until a route of the server can hold them.

All the figures come from other modules' public APIs:

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

- **The header** — the period of the dashboard (24 h, 7 d, 14 d, 30 d or custom days) and the
  time zone of the workspace. The days of a period are the days of the workspace, so that two
  people in two countries see the same bars.
- **The widgets** — Success rate, Run duration, Right now, Needs you, Pipelines, Activity and
  Quick actions, on the widget grid of `@scylla/ui`. The figures of a period follow the period
  picker, and the period stays in the URL, so a link shows the same figures.
- **The edit mode** — "Edit" in the header. Each widget shows its sizes and Remove; the bar
  under the header adds a widget, renames or deletes the dashboard.

The second sidebar lists the dashboards ("Overview" first) and "New dashboard".

Access is gated on `READ_WORKSPACE` — the same permission as the projects list, because both
are reads of the workspace and this page is the redirect target for anyone landing on an org
without a deeper destination.

## Related modules

- [pipeline](../pipeline/README.md), [jobs](../jobs/README.md),
  [workspace](../workspace/README.md) — the data sources.
- [shell](../../shell/README.md) — the shell this page renders inside.
