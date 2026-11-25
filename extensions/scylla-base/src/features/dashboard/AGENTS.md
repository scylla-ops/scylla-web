# `features/dashboard` — agent guide

The workspace landing page: a grid of widgets that shows the jobs and the pipelines of a period.

**Layer** `features/` · **id** `dashboard` · **DI key** `dashboard` (`dashboardLayoutRepository`, `dashboardPreferences`, `attentionRepository`)

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

Empty (`export {};`). Nothing outside the page reads the dashboard. Never export a component
from it: Rollup cannot drop a `.svelte` that a barrel re-exports, and the import of a type
would pull bits-ui into the chunk of the importer.

## Data contract

**This module owns two resources of DashboardService: the dashboards and the items of "Needs
you".**

- A dashboard is a name, a visibility (`private` or `workspace`), the team default mark, a
  `version`, and an ordered list of `{ id, data, size, target? }`
  (`domain/structs/dashboard-layout.struct.ts`). `target` is the id of the agent or of the
  pipeline of a dedicated widget. It is optional, so the format stays schema version 1:
  `toWidgetList` keeps a text target, and `toWidgets` writes it only when it is set.
- `DashboardLayoutRepository` (port) has `list`, `create`, `update`, `remove` and
  `setTeamDefault`. `GrpcDashboardLayoutRepository` implements it. The widgets go in
  `widgets_json` with `schema_version` 1 (`grpc-dashboard.mapper.ts`). A widget list of another
  schema version reads as no widget. When you change the format, increase
  `WIDGETS_SCHEMA_VERSION` and read the old format too.
- **Each change sends the `version` that the page read.** The server refuses a stale version with
  `ABORTED`. The mutations then show "This dashboard changed in another tab or for another
  person" and read the dashboards again. Never retry the write with the new version: the change
  of the other person would be lost.
- `DashboardPreferences` stays in the browser (`LocalDashboardPreferences`): the default dashboard
  of the person (`dashboards-default:<workspace id>`), the last visit
  (`dashboards-visit:<workspace id>`), and the layouts of an older build
  (`dashboards:<workspace id>`).
- **First load of a workspace with no dashboard on the server:** the layouts of an older build go
  to the server, then the browser forgets them. With none, the page creates "Ops overview" with
  `TEMPLATES.bento`. When the person cannot create a dashboard, the page shows that layout and
  saves nothing.
- The default dashboard: the choice of the person, else the team default, else the first one.
- `AttentionRepository` reads `ListAttentionItems` (`attention.queries.ts`, each 30 s), for the
  scope of the panel. `since` is the last visit before this page load: the items after it are
  new.

The ViewModels of the page read, through public APIs only:

| From | Read |
|---|---|
| `@platform/context` | `contextStore` — the current workspace |
| `@platform/authz` | `can`, `Permission` — the Locked state of a widget |
| `features/workspace` | `workspaceQueries.mine` — the time zone of the current workspace (`createDashboardPeriod`) |
| `features/jobs` | `jobQueries.stats` (GetJobStats), `jobQueries.newest` (the live jobs, the job ends of the period), `successRate`, `successRateChange` |
| `features/pipeline` | `pipelineQueries.summaries` (ListPipelineSummaries; with `pipelineIds` for the Pipeline widget), `createRunPipeline` (Quick actions, Pipeline) |
| `features/jobs` (Pipeline) | `jobQueries.byPipeline` (ListPipelineJobs): the nodes of the newest job |
| `features/apps` | `appQueries.runners` (the agents, the picker), `appQueries.agentStatsOf` (GetAgentStats), `appQueries.jobs` (the last jobs of one agent) |

All these reads are `queryOptions` objects, so this module shares one cache entry per resource
with whoever else reads it.

## Layout

```
dashboard.module.ts                     routes, nav, the layout repository, the panel of the sidebar
index.ts                                public API
domain/structs/dashboard-layout.struct.ts   the set, the layout, the templates, their changes — tested
domain/repository/dashboard-layout.repository.ts   the port of the set
infrastructure/grpc-dashboard-layout.repository.ts  the dashboards on DashboardService
infrastructure/grpc-dashboard.mapper.ts     Dashboard ↔ the layout, `widgets_json`, the visibility
infrastructure/local-dashboard-preferences.ts   the default of the person, the last visit, the old layouts
infrastructure/grpc-attention.repository.ts + grpc-attention.mapper.ts   ListAttentionItems
domain/structs/attention.struct.ts          an item of Needs you, its kinds and its counts
infrastructure/stored-dashboards.mapper.ts  the JSON of the old layouts, the widget list — tested
infrastructure/grpc-agent-metrics.repository.ts  GetAgentMetrics: the CPU and the memory of one agent by hour
presentation/
  dashboard-layout.queries.ts           the query of the set, the mutations, the conflict message
  attention.queries.ts                  the items of Needs you, the last visit
  messages/editor.messages.ts           the strings of the edit mode, the dialogs and the drawer
  messages/catalog.messages.ts          the names of the kinds and of the data
  presenters/widget-catalog.presenter.ts   the kinds of the palette, the data, their sizes
  presenters/widget-resize.presenter.ts    the size under a resize drag — pure
  presenters/dashboard-paths.presenter.ts  `dashboard` or `dashboards/<id>`
  ui/dashboards.state.svelte.ts         the set and its changes (create, rename, default, delete)
  ui/dashboard-editor.state.svelte.ts   the edit mode: the draft, the undo, the selection, the drag
  ui/DashboardPanel/                    ViewPanel (dashboards, period, scope, Edit dashboard) and
                                        EditPanel (the palette, the changes, Cancel, Save layout)
  ui/Dashboard/MobileBar.svelte         the controls of the page on a phone
  ui/DashboardEditor/                   DashboardWidget (data → component), EditableWidget (handles,
                                        toolbar, resize), AddWidgetDialog, WidgetDrawer,
                                        NewDashboardDialog, RenameDialog, previews and thumbnails
  messages/dashboard.messages.ts        every string on the page
  presenters/zoned-day.presenter.ts     days and midnights in an IANA zone — pure, node-tested
  presenters/period.presenter.ts        the periods, their instants and their bucket — pure, node-tested
  presenters/period-options.presenter.ts   the texts of the period picker
  presenters/job-figures.presenter.ts   rate, change, durations, bars and axis of the widgets — pure, tested
  presenters/widget-rows.presenter.ts   the rows of Right now, Needs you, Activity and Pipelines — pure, tested
  mappers/period-search.mapper.ts       the period ↔ the query string (`?period=7d`, `?from=…&to=…`)
  messages/widgets.messages.ts          every string of the widgets
  ui/dashboard-period.state.svelte.ts   the period of the page and the time zone of the workspace
  ui/Dashboard/Dashboard.page.svelte    the page
  ui/PeriodPicker/CustomPeriodForm.svelte   the form of a custom period
  ui/DashboardPanel/                    the panel of the second sidebar: dashboards, period, scope
  ui/dashboard-view.state.svelte.ts     what the page and the panel share: the period, the project
  presenters/view-figures.presenter.ts  capacity, ticks of 24 h, shares, counts — pure, node-tested
  messages/widgets-view.messages.ts     the strings of the widgets of the view mode
  ui/widgets/dashboard-widgets.state.svelte.ts   the queries of the widgets, with the period
  ui/widgets/<Name>Widget/              Sentence, Timeline (last 24 h), Right now, Needs you,
                                        Success rate, Agents, Pipelines, Runs, Run minutes,
                                        Run duration, Activity, Quick actions, Ranking, Heatmap,
                                        Agent, Pipeline (each new one with its state)
  presenters/ranking.presenter.ts       the rows of a ranking — pure, tested
  presenters/heatmap.presenter.ts       the days of the heatmap, the week grid, the levels — pure, tested
  presenters/agent-widget.presenter.ts  the slots, the load and the strip of one agent — pure, tested
  presenters/pipeline-widget.presenter.ts   the last run, the state and the nodes of one pipeline — pure, tested
  ui/DashboardEditor/TargetPicker.svelte    the agent or the pipeline of a dedicated widget
  ui/widgets/parts/                     WidgetBody (the states), BucketAxis, ChangeBadge, WidgetLink
                                        (a link, or plain text when it has no page), BarTip
  ui/widgets/widget-navigation.ts       the links of the widgets: a job, the jobs or the triggers of
                                        a pipeline, an agent, a project, the subject of an event
```

No `domain/`, no `infrastructure/` — correct for this module, do not add them.

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `workspace` | `dashboard` | `READ_WORKSPACE` | `Dashboard.page.svelte` (the default dashboard) |
| `workspace` | `dashboards/:dashboardId` | `READ_WORKSPACE` | `Dashboard.page.svelte` |

Sidebar: section `workspace`, order `10`, icon `LayoutDashboard`. The rail item `dashboard`
shows `DashboardPanel` (`shell.secondSidebarPanels`), not links. An unknown id opens
`/dashboard`.

`READ_WORKSPACE` is intentionally the same gate as the projects list: the overview is a read
of the workspace, and it is where every org-level redirect lands. Do not tighten it to a
narrower permission without moving that redirect target too.

## Rules that bite here

- **Each role of the workspace opens this page, so a widget reads only what the role can read.**
  A widget that the role cannot read shows Locked and sends no request.
- **Never add a repository for the data of another module.** The layout repository holds only
  the layouts. If the dashboard needs a new figure, add the query to the module
  that *owns* the resource and export the options factory from its `index.ts`. A
  `pipelineRepository` call made from here would fork the query cache into two keys for one
  resource.
- That is why `pipelineQueries.byWorkspace` / `jobQueries.byWorkspace` live in `pipeline` /
  `jobs` even though the dashboard is their only consumer.
- Cross-feature aggregation belongs in a `*.state.svelte.ts`, derived with `$derived` — not in
  a store, not in an effect.

- **The page is a `WidgetGrid` of `@scylla/ui`.** The figures are `xs` widgets. A new widget is
  a `Widget` of a size, with a `WidgetState` while it has no data. `packages/ui/AGENTS.md`,
  "Widgets", gives the grid.
- **The days of the dashboard are the days of the workspace, not of the browser.**
  `createDashboardPeriod` reads the zone from `workspaceQueries.mine`. Until it loads, the days
  count in UTC, and the header does not name a zone. A zone that the browser does not know
  counts as UTC.
- **A query reads the instants of the period when it runs, not in its key.** Put
  `period` (and the zone) in the key, and call `rangeAt()` in `queryFn`. The instants of a preset
  move with the clock: in a key, they make a new cache entry for each render.
- **`periodRange` gives what `GetJobStats` needs**: `from`, `to` (`null` is now) and the bucket
  (`hour` for 24 h and for a custom day, `week` above 92 days, else `day`). Presets count whole
  days, today included, from midnight of the zone.
- **The period is in the URL**: `?period=24h|7d|30d`, or `?from=YYYY-MM-DD&to=YYYY-MM-DD` for
  custom days. The default (14 d) writes no parameter. A choice replaces the current history
  entry. A custom period of the URL that ends in the future or is longer than one year gives the
  default.
- **The widgets of a period get it from `createDashboardWidgets`.** `PeriodScope.scope` is
  `[period, zone]`, and `range()` calls `rangeAt()` when a query runs. Success rate and Run
  duration share one `GetJobStats` call (`compare: true`): one cache entry. Activity reads the
  job ends created in the period. Right now, Needs you and Pipelines show the state of now and
  do not read the period.
- **Needs you reads `ListAttentionItems`**: all the kinds (failed or orphaned job, approval,
  failed fire, missed time, offline agent), the open and the new counts, and the error of the
  node or of the job. A `PERMISSION_DENIED` shows Locked. The summary sentence counts the open
  items of the server.
- Activity is partial: the job ends only (no G1). Quick actions has no "Fire a trigger" (C1)
  and no "Add a secret" (a secret belongs to a project).
- **The page has no header.** The Figma page "Dashboard" (`695:13437`, frame `1524:6327`) puts
  the list of dashboards, the period, the time zone and the scope in the second sidebar. The
  module gives `DashboardPanel` in `shell.secondSidebarPanels` for the rail item `dashboard`.
- **The page and the panel share one period.** The page creates it and attaches it to
  `dashboardView`; the panel reads it there. Never create a second `createDashboardPeriod`: it
  would not see the writes of the other one.
- **The scope is one project or all.** `GetJobStats` gets `projectIds`. The other widgets keep
  the pipelines and the jobs of the project (by `PipelineSummary.projectId`).
- **Each widget takes `size`.** The default layout of the design: Sentence `l`, Timeline `m`,
  Right now `m`, Needs you `l`, Success rate `s`, Agents `s`, Pipelines `m`, Runs `m`, then four
  `xs` (Run minutes, Run duration, Right now, Agents). An `xs` widget with its own title in the
  content sets `bare`.
- **A widget that the user cannot read shows Locked.** Success rate, Run duration, Right now
  and Activity need `LIST_JOBS_BY_WORKSPACE`, Pipelines needs `LIST_PIPELINES_BY_WORKSPACE`,
  Needs you needs both. The server gives `GetJobStats` and `ListPipelineSummaries` with the same
  role as these lists.
- **Ranking reads `GetJobStats` by pipeline** (`groupOrder` `p50-duration` or `failed`, 10
  groups, `compare`), for the period and the scope. "Most failures" counts the failed and the
  orphaned jobs; a pipeline with none is not in the list. Up is bad for both.
- **Heatmap reads `GetJobStats` with buckets of one hour**, and adds them by weekday and hour of
  the zone of the workspace (`weekGrid`). The server refuses more than 1000 buckets, so the grid
  counts the days of the period, at least the last 7 and at most the last 41
  (`heatmapRange`). Its key is `['heatmap', period, zone]`.
- **Agent** reads the agent in `appQueries.runners`, `GetAgentStats` for the UTC days of the
  period, its last jobs, its running jobs in `live`, and `GetAgentMetrics` for 24 hours. It shows
  Locked when the list of the agents does not run (`canReadAgents`). With no `READ_APP_STATS`,
  its figures show an em dash.
- **Pipeline** reads `ListPipelineSummaries` with `pipelineIds: [target]`, `GetJobStats` with
  `pipelineIds` for the runs of the period, and the newest job for its nodes. It needs
  `LIST_PIPELINES_BY_WORKSPACE` (Locked). "Run" shows with `RUN_PIPELINE` only.
- **A bar of Success rate (`DayBars`) and of the load of Agent (`LoadBars`) is a gauge.** Each bar
  has a track of the full height (`bg-muted/70`), and the value fills it from the bottom. A day
  bar fills against the highest day (`dayBars`); a load bar fills against 100 % (`loadFill`), at
  least 2 % above 0. A bucket with no run, or an hour with no sample, shows a dashed track and no
  fill: it is not a real 0 %. The tooltip of a day with no run says "No run". The figure of a load
  is `loadText`: the percent of the language of the UI ("45%", "45 %" in French).
- **The legends of Success rate and of Last 24 hours use the same words**: the outcomes of all
  the jobs, in the plural ("Completed", "completed"; "Terminés", "terminés"). The context `legend`
  separates them from the outcome of one job (context `one job`).
- **A mark of a strip of runs opens its job**, as on the pipelines list: Pipelines (`s`, `m`,
  `l` and the sheet), Pipeline (each size), the recent jobs of Agent and the ticks of Last 24
  hours. Each mark is a `JobRunMark` of `@shared/presentation/ui`, with a `RunMark` of
  `widget-rows.presenter.ts` (`runMark`, `recentRuns`, `jobMarks`), and `jobMarkLink` gives its
  `href` and the click that sets the project first. Never draw a mark with no click for a job:
  use `JobRunMark`.
- **What looks clickable opens a page, with a real link.** A name, a count or a bar of a widget
  is an `<a href>` (`WidgetLink`, `JobRunMark` with `href`, `BarTip` with `href`, `Button` with
  `href`), so a middle click opens a new tab. Its `title` tells what a click opens. The URLs come
  from `scyllaHref` of `@platform/context`, through `widget-navigation.ts`. A link into a project
  sets the project and the pipeline of the store on a plain click (`enterPlace`), as
  `scyllaNavigate` does. With no page (a job of a pipeline that the dashboard does not know, the
  triggers without `MANAGE_TRIGGERS`), the text shows with no link and no hover.
- **The targets:** a job (Right now, Needs you, Sentence, Agent, Pipeline, the fires of
  Schedules, the ticks of Last 24 hours); with a node, the logs of that node (the stages of
  Pipeline); the jobs of a pipeline (Pipelines, Ranking, Pipeline, the most failures of Success
  rate, the slowest of Run duration); the triggers of a pipeline (Schedules, a fire of Needs
  you, a webhook trigger of Webhooks); an agent (Agents, Agent, Needs you); the agents (the count
  of Agents and of Sentence); a project (the projects of Run minutes); the Integrations page (a
  connection of Webhooks); the subject of an event of Activity (`activityLink`: an event names
  its pipeline, so the dashboard finds the one pipeline of that name in the project).
- **A bar of one day or one week opens the dashboard on that period** (`bucketHref` of the
  period: `?from=…&to=…`): the bars of Success rate and of Runs, and the peak of Runs. A bar of
  one hour has no link: a custom period has whole days. The jobs list has no filter of its URL
  and the workspace has no list of its jobs: the bars cannot open a list of jobs.
- **The success rate is completed / (completed + failed + orphaned).** The cancelled jobs show
  apart. Its change is in points; the change of a duration is in percent, and down is good.

## Edit mode

The Figma page "Dashboard" (`695:13437`) draws it: frames `1525:6879` (edit), `1526:7446` (add
a widget), `1527:8165` (widget data), `1529:8782` (layouts), `1529:9001` (new layout).

- **"Edit dashboard" starts a draft** (`dashboardEditor`). Each change goes to the draft and to
  its undo list. "Save layout" stores the draft in the set; "Cancel" drops it. The page and the
  panel read the same module state.
- **The palette replaces the panel.** A kind with data opens "Add a widget", or drags onto the
  grid. A kind with no data shows "soon". Each kind has data now.
- **A dedicated widget (`DATA[data].target`) shows one agent or one pipeline.** "Add a widget"
  and the drawer show `TargetPicker`. "Add a widget" takes the first choice when the user picks
  none. A widget that a drag of the palette adds has no target: it asks for one. A target that
  the list does not have any more shows "This agent is gone" or "This pipeline is gone".
- **A widget in the grid** has Remove (top left), a handle to drag it (top), a corner to resize
  it, and a toolbar when selected: the sizes, Data (the drawer), Duplicate, Delete. A drag shows
  "Drop here" where the widget lands; the grid packs the rest (`grid-flow-row-dense`).
- **A widget shows only the sizes of `DATA[data].sizes`.** The toolbar and the dialogs disable
  the others. A stored size that the widget cannot show becomes its first size.
- **A new dashboard** starts from a template (Calm, Bento, Blank) or a copy of the open one,
  and opens in the edit mode.
- **On a phone, the shell hides the panel.** `MobileBar` (under 768 px) gives the dashboard, the
  period and Edit; in the edit mode, Cancel, the changes, Save layout and a floating "Add
  widget". The design draws bottom sheets for the dialogs: they are centred dialogs today.
- **Not done yet:** "See all" of a ranking, the labels of an agent (the server has none: the
  widget shows the facts of the host), "up since restart" of an agent (no data: the large size
  shows the p95), a heatmap of the failures, sharing a dashboard (the section "Shared", "Who can see it"), a period or a
  scope for one widget, the filters, the thresholds, and the keyboard shortcuts.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles &&
pnpm i18n:collisions` — all clean.
New strings: add them to `dashboard.messages.ts` (never inside a `.svelte`), then
`pnpm extract && pnpm compile`.
