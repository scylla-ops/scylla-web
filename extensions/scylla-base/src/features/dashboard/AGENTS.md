# `features/dashboard` — agent guide

The workspace landing page: a grid of widgets that shows the jobs and the pipelines of a period.

**Layer** `features/` · **id** `dashboard` · **DI key** `dashboard` (`dashboardLayoutRepository`)

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

Empty (`export {};`). Nothing outside the page reads the dashboard. Never export a component
from it: Rollup cannot drop a `.svelte` that a barrel re-exports, and the import of a type
would pull bits-ui into the chunk of the importer.

## Data contract

**This module owns one resource: the layouts of the dashboards.** A layout is a name and an
ordered list of `{ widget, size }` (`domain/structs/dashboard-layout.struct.ts`).
`DashboardLayoutRepository` reads and saves the layouts of one workspace.
`LocalDashboardLayoutRepository` keeps them in `localStorage`, at the key `dashboards:<workspace
id>`. A route of the server can replace it later: change only `dashboard.module.ts`.

The ViewModels of the page read, through public APIs only:

| From | Read |
|---|---|
| `@platform/context` | `contextStore` — the current workspace |
| `@platform/authz` | `can`, `Permission` — the Locked state of a widget |
| `features/workspace` | `workspaceQueries.mine` — the time zone of the current workspace (`createDashboardPeriod`) |
| `features/jobs` | `jobQueries.stats` (GetJobStats), `jobQueries.newest` (the live jobs, the job ends of the period), `successRate`, `successRateChange` |
| `features/pipeline` | `pipelineQueries.summaries` (ListPipelineSummaries), `createRunPipeline` (Quick actions) |

All these reads are `queryOptions` objects, so this module shares one cache entry per resource
with whoever else reads it.

## Layout

```
dashboard.module.ts                     routes, nav, the layout repository, the sidebar links
index.ts                                public API
domain/structs/dashboard-layout.struct.ts        the layout, and its changes — pure, node-tested
domain/repository/dashboard-layout.repository.ts the port of the layouts
infrastructure/local-dashboard-layout.repository.ts  the layouts in `localStorage`
infrastructure/stored-dashboards.mapper.ts       the stored JSON ↔ the layouts — node-tested
presentation/
  dashboard-layout.queries.ts           the query and the mutation of the layouts
  presenters/dashboard-paths.presenter.ts   the path of a dashboard, the path of a new one
  presenters/widget-sizes.presenter.ts  the sizes that each widget can show
  presenters/widget-titles.presenter.ts the title of each kind of widget
  ui/dashboard-layout.state.svelte.ts   the dashboard of the URL, its changes, the edit mode
  ui/dashboard-links.state.svelte.ts    the dashboards in the second sidebar (`secondSidebarLinks`)
  ui/DashboardEditor/                   DashboardWidget (kind → component), WidgetEditTools
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
  ui/PeriodPicker/                      24 h, 7 d, 14 d, 30 d, Custom; the form of a custom period
  ui/widgets/dashboard-widgets.state.svelte.ts   the queries of the widgets, with the period
  ui/widgets/<Name>Widget/              Success rate, Run duration, Right now, Needs you, Pipelines,
                                        Activity, Quick actions
  ui/widgets/parts/                     WidgetBody (the states), BucketAxis, ChangeBadge
  ui/widgets/widget-navigation.ts       opens a job or the jobs of a pipeline from a widget
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `workspace` | `dashboard` | `READ_WORKSPACE` | `Dashboard.page.svelte` (the default dashboard) |
| `workspace` | `dashboard/:dashboardId` | `READ_WORKSPACE` | `Dashboard.page.svelte` |

Sidebar: section `workspace`, order `10`, icon `LayoutDashboard`, group `dashboard`
("Dashboards"). The route `dashboard` is the link "Overview". `dashboardLinks` adds the other
dashboards after it, then "New dashboard" (`dashboard/new`), apart.

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
- **The widgets use only the routes that exist.** Needs you is partial: the red pipelines of
  `ListPipelineSummaries` (last ended job failed or orphaned) and the jobs that wait for an
  approval. It has no "new" mark and no error text: these need `ListAttentionItems` (D1).
  Activity is partial: the job ends only (no G1). Quick actions has no "Fire a trigger" (C1)
  and no "Add a secret" (a secret belongs to a project).
- **A widget shows only the sizes of `WIDGET_SIZES`.** The design gives each widget XS, S, M
  and L (Quick actions: XS, S, M). Today, a list widget shows M and L (L shows more rows), and
  Success rate, Run duration and Quick actions show M only. The edit mode offers only these
  sizes. A stored size that a widget cannot show becomes its first size. When you add the
  layout of a size to a widget, add the size to `WIDGET_SIZES`.
- **The default dashboard always exists.** It has the id `default`, no name of its own
  (the page shows "Overview") and it cannot be deleted. A dashboard id of the URL that does
  not exist opens the default dashboard. `dashboard/new` makes a dashboard with no widget,
  opens it and starts the edit mode.
- **The edit mode is one state for the page** (`dashboardEditMode`). In it, each widget shows
  `WidgetEditTools` over its card (`editing` of `Widget`): the sizes and Remove. The bar under
  the header has the name, "Add a widget" and "Delete the dashboard". Each change saves at
  once. A widget shows once on a dashboard. There is no drag and drop yet.
- **A widget that the user cannot read shows Locked.** Success rate, Run duration, Right now
  and Activity need `LIST_JOBS_BY_WORKSPACE`, Pipelines needs `LIST_PIPELINES_BY_WORKSPACE`,
  Needs you needs both. The server gives `GetJobStats` and `ListPipelineSummaries` with the same
  role as these lists.
- **The success rate is completed / (completed + failed + orphaned).** The cancelled jobs show
  apart. Its change is in points; the change of a duration is in percent, and down is good.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles &&
pnpm i18n:collisions` — all clean.
New strings: add them to `dashboard.messages.ts` (never inside a `.svelte`), then
`pnpm extract && pnpm compile`.
