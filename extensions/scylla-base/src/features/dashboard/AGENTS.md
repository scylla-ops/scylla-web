# `features/dashboard` — agent guide

The workspace landing page: a grid of widgets that shows the jobs and the pipelines of a period.

**Layer** `features/` · **id** `dashboard` · **DI key** none (`domain: {}`)

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

Empty (`export {};`). Nothing outside the page reads the dashboard. Never export a component
from it: Rollup cannot drop a `.svelte` that a barrel re-exports, and the import of a type
would pull bits-ui into the chunk of the importer.

## Data contract

**This module owns no data and has no repository.** `domain` is `{}` and it is registered in
`shell/modules.ts` for its route alone. There is no domain accessor, and adding one would be
wrong.

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
dashboard.module.ts                     route + nav, empty domain
index.ts                                public API
presentation/
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

No `domain/`, no `infrastructure/` — correct for this module, do not add them.

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `workspace` | `dashboard` | `READ_WORKSPACE` | `Dashboard.page.svelte` |

Sidebar: section `workspace`, order `10`, icon `LayoutDashboard`.

`READ_WORKSPACE` is intentionally the same gate as the projects list: the overview is a read
of the workspace, and it is where every org-level redirect lands. Do not tighten it to a
narrower permission without moving that redirect target too.

## Rules that bite here

- **Each role of the workspace opens this page, so a widget reads only what the role can read.**
  A widget that the role cannot read shows Locked and sends no request.
- **Never add a repository.** If the dashboard needs a new figure, add the query to the module
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
- **Each widget has one size on this page** (Pipelines `l`, the others `m`). The other sizes of
  the design come with the edit mode of the layout.
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
