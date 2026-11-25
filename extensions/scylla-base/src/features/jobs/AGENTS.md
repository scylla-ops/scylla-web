# `features/jobs` — agent guide

Pipeline runs: their status, their logs, and the live tail of both.

**Layer** `features/` · **id** `jobs` · **DI key** `jobsRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts` (`apps` for the
  agent of a job, `integrations` for the reports of a job and the Integrations URL, `user` for
  the name of the person who approved a job).
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type JobEntity
type JobEvent, JobFilter              ← the filters of a list of jobs
type NewestJobsQuery                  ← the newest jobs of a workspace, by status and period
type JobStats, JobFigures, JobOutcomes, JobBucket, JobGroup, JobStatsQuery,
     JobStatsBucketSize, JobStatsGroupBy, JobStatsOrder   ← the figures of GetJobStats
decidedJobs, successRate, successRateChange               ← the rules of the success rate
type JobLog, JobLogStream
type JobsSummary, JobStatus
summarizeJobs, isActiveStatus, isFinishedStatus
JOBS_QUERY_KEY, WORKSPACE_JOBS_QUERY_KEY, JOBS_QUERY_ROOT
jobQueries, asJobFeed, WORKSPACE_JOBS_WINDOW
type PeriodScope, JobStatsShape, NewestJobsShape   ← the inputs of jobQueries.stats / .newest
jobsByPipelinesQueries, type PipelineHistory   ← the history of the pipelines list (30 jobs each)
loadJobsPage                          ← a loader, not the page
```

The
factories in `presentation/jobs.queries.ts` resolve the repository through
`getModuleDomain('jobs')` per call, and a component runs them with `createQuery` /
`createMutation` from `@scylla/core-sdk`.

`dashboard` and `pipeline` run the same factories with `createQuery` / `createQueries`, and
share the *same* cache entry as this module's pages.

`loadJobsPage` is a **loader** (`() => import(…)`), never the component. `pipeline` composes this
page behind its own route because it owns the "Run" action, and a `.svelte` re-exported from a
barrel cannot be tree-shaken out of whoever imports that barrel for something else —
`pipeline` imports `JOBS_QUERY_KEY` from here. A function keeps the chunk separate.
`JobDetails.page.svelte` is mounted by this module's own route, so it
stays private.

Never add: `jobs.module.ts`, and never export a `.svelte` component from this barrel.

## Data contract

`JobsRepository` — `domain/repository/jobs.repository.ts`:

| Method | Returns |
|---|---|
| `getByPipelineId(id, pagination?, filter?)` | paginated `JobEntity` list, only the jobs that match the filter |
| `getByWorkspaceId(...)` | paginated `JobEntity` list |
| `getNewestByWorkspaceId(query)` | `JobEntity[]` — one page, newest first, `JOB_VIEW_SUMMARY` (no node) |
| `getStats(query)` | `JobStats` — `GetJobStats`: totals, buckets, groups, previous period |
| `getById(jobId)` | `JobEntity` |
| `deleteById(jobId)` | `void` |
| `rerun(jobId)` | `string` — the id of the new job |
| `cancel(jobId)` | `void` |
| `approve(jobId)` / `reject(jobId)` | `JobEntity` — the job from a fork after the decision |
| `getLogs(...)` | `JobLog[]` |
| `tailLogs(jobId, nodeId?)` | **`JobLogStream` — synchronous, not a Promise** |

`tailLogs` is the one non-`Promise` method in the codebase: it opens a server stream and returns
the handle immediately. It is a genuine outside-the-framework subscription, so it belongs in
`tail-job-logs.state.svelte.ts` — and **the stream is always closed on teardown**. A failure of
the stream ends the iteration of `logs` with a throw: the state logs the failure, exposes it as
`error`, and keeps the lines read before it. `isError` is set only when no line was read: the
panel then shows the error instead of an empty log; after some lines, it says under them that
the live tail stopped.

Each method rejects with a `ScyllaError` on failure. Reach it from `jobs.queries.ts` only — never from a component.

## Layout

```
jobs.module.ts                       DI wiring + the job details route (no nav)
index.ts                             public API
domain/
  structs/job-stats.struct.ts        JobStats and its parts, JobStatsQuery, successRate,
                                     successRateChange (pure, tested)
  entities/job.entity.ts             JobEntity, JobFilter, NewestJobsQuery, JobEvent, JobNode,
                                     JobNeed (the snapshot of the nodes: the graph of the job),
                                     JobNodeExecution (with the ports that a switch opened),
                                     NodeExecutionState, JobLog, JobLogStream, and the Git
                                     context: JobSource, JobApproval, PipelineFileRef,
                                     PipelineFileError, JobCheckout
  repository/jobs.repository.ts
infrastructure/
  default-jobs.repository.ts       JobServiceClient → JobEntity; tailLogs maps the stream
  grpc-job.mapper.ts
  grpc-job-stats.mapper.ts         JobStatsQuery → GetJobStatsRequest, the figures → JobStats
presentation/
  jobs.query-keys.ts                 key factories — import these, never inline a key
  jobs.queries.ts                    every read and write, as query/mutation options
  jobs-by-pipelines.queries.ts       the fan-out across pipelines, avoids N+1
  ui/Jobs.page.svelte, JobsHeader.svelte
  ui/JobDetails/                     one job: its header, its alerts, and its log beside its nodes
    JobHeader.svelte                       the id, the status, Details and Re-run, then JobFacts
    JobFacts.svelte                        the facts on one line, each with its icon
    JobDetailsPanel.svelte                 Details: one row for each group (Run, Source, Report)
    JobDetailsGroup.svelte                 a group of Details: its title, then its items on one line
    JobDetailsFact.svelte                  a fact of a group: its label and its value on one line
    JobRunFacts.svelte                     the group Run: status, duration, times, agent, labels
    JobAlerts.svelte                       the approval, the unfit agents, the invalid file or the error
    job-agent.state.svelte.ts              the name and the link of the agent of a job
    job-log-place.state.svelte.ts          the node of the log and the full screen, in the URL
    JobLogWorkspace/                       the split view: the list of the nodes (or its select under
                                           768 px), the handle, the viewer; the full screen
    NodePathNote.svelte                    the ports of a switch, where a failure went
    JobSourceFacts.svelte                  the group Source: repo, ref, SHA, PRs, author, fork,
                                           event, pipeline file, approval decision
    JobReportsBand.svelte                  the group Report: a chip for each report, its state, its retry
    JobApprovalBlock.svelte                Approve and run / Reject of a job from a fork
    InvalidFileAlert.svelte                the errors of an invalid pipeline file
    UnfitAgentsAlert.svelte                the online agents that cannot get the code of a waiting job
    JobGraph/                              the read-only xyflow graph, its node view, its context
  ui/jobs-table/JobSource/           the Source cell, two lines: author and title, then SHA with
                                     the report icon, ref, PRs
  messages/jobs.messages.ts                every string — `lingui extract` cannot read `.svelte`
  messages/job-log.messages.ts             the strings of the log viewer and of the list of nodes
  messages/job-git.messages.ts             the strings of the Git context of a job
  presenters/job-source.presenter.ts     the ref, the event and the PR numbers of a commit
  presenters/job-report.presenter.ts     the row and the tone of a report, the no-report reason
  presenters/job-run-times.presenter.ts  runTimes: the times of a run, only the hour on the day of
                                         the creation
  presenters/job-status.presenter.ts     the label and the hint of a status (invalid file,
                                         waiting reason, approval)
  presenters/job-steps.presenter.ts      the steps of the page: the checkout, then the nodes
  presenters/job-file.presenter.ts       `path:line:column` of a file error
  presenters/jobs-summary.presenter.ts   JobsSummary, summarizeJobs
  presenters/job-timeline.presenter.ts   segment geometry, pure and tested in node
  presenters/node-attempt.presenter.ts   attemptOf: the `Attempt N/M` of a node
  presenters/job-path.presenter.ts       jobPath: the state of each need, why a node was skipped,
                                         the error branches (the run rule of the agent)
  presenters/job-graph.presenter.ts      jobGraph: the nodes and edges of the graph, in the
                                         column layout of the editor
  presenters/ansi.presenter.ts           parseAnsiLine: the clean text and the styles of a line
  presenters/log-lines.presenter.ts      readLogLine, the error patterns, the search, `#L<line>`
  presenters/job-log-place.presenter.ts  the `node` and `fullscreen` parameters, old `nodes` links
  presenters/job-node-rows.presenter.ts  the duration and the timeline bar of each node
  ui/jobs-table/                     JobsTable + jobs-table.columns.ts + cells
  ui/jobs-log/
    tail-job-logs.state.svelte.ts          the stream of the whole job: lines by node, error counts
    log-display-settings.state.svelte.ts   the display settings, in `localStorage`
    JobLogViewer/                          the viewer: toolbar, CodeMirror, footer
      job-log-viewer.state.svelte.ts         the source, the search, the errors, the line link
      streamed-log-view.state.svelte.ts      owns the editor document + tail-follow
      log-editor.ts                          the CodeMirror theme, marks and gutters
      log-shortcuts.attachments.ts           `/`, `E`, `Shift+E`, `F`, `Escape`
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `project` | `pipelines/:pipelineId/jobs/:jobId` | `READ_JOB` | `JobDetailsPage` |

The job page has the share button of the top bar (`share: true`): it copies the URL with its
query and its hash.

No nav entry. The jobs **list** is not declared here: it is mounted by
[`pipeline`](../pipeline/AGENTS.md) at `project` → `pipelines/:pipelineId/jobs`, gated on
`LIST_JOBS_BY_PIPELINE`, via `PipelineJobsRoute`, because that page needs a Run action. If you
change `JobsPage`'s props, that is the call site to update. `pipeline` also gives the page a
`filter` (a `JobFilter`: branch, event, author login, pull request) and a `toolbar` snippet with
the controls of the filter, rendered under the header. A job with no commit matches no filter.
With a filter that matches no job, the empty list does not tell the user to run the pipeline.

One job needs nothing from `pipeline`, so its route lives here, with its full path. Its page
shows the crumbs "Pipeline #name" and "Jobs" of `pipeline`, because its path starts with their
paths.

## Rules that bite here

- **The reason of a failure has two places.** The page shows `job.error` in a box. The agent writes
  each failed attempt in the logs of its node (`scylla-agent: attempt <n> failed: <reason>`), so
  `run.error` is not mapped. A skipped node has no log: the viewer says why in place of the log.
- **Query keys come from `jobs.query-keys.ts`.** Four exist; three (`JOBS_QUERY_KEY`,
  `WORKSPACE_JOBS_QUERY_KEY`, `JOBS_QUERY_ROOT`) are exported publicly so other modules
  invalidate the *same* key this module queries, and `JOB_QUERY_KEY` (one job, read by the
  details page) stays internal. Never hand-write `['jobs', ...]`.
- `JOBS_QUERY_ROOT` is the prefix for "invalidate everything jobs-related" after a run;
  `JOBS_QUERY_KEY(pipelineId)` is exact. Pick deliberately.
- **`JobStatus`, `isActiveStatus` and `isFinishedStatus` are rules of the domain**, shared with
  `agents`: they are in `@shared/domain/structs/job-status.struct.ts`, and this barrel
  re-exports them. `JobEntity.status` is a `JobStatus`: the mapper gives `unknown` for an arm
  newer than this build. `summarizeJobs` is a presenter. Status logic goes there, not into a component.
- **Log tailing is a subscription to something outside the framework**, so it is a Svelte
  action / `*.state.svelte.ts` owner — `tail-job-logs.state.svelte.ts` — and never reactivity. It opens the
  stream and **closes it on teardown**; the same holds for `streamed-log-view.state.svelte.ts`, which
  drives a CodeMirror instance through `renderCodeMirror` (`@scylla/ui`).
- **The page reads one stream for the whole job.** `tailLogs(jobId)` with no node gives each line
  with its node. The tail reads each line once (`readLogLine`: the escape codes, the error
  patterns), files it under its node and counts the errors of each node. The list shows these
  counts, and a change of node is a filter, not a new stream. A flush reads 5000 lines at most
  each 150 ms, so a long finished log does not block the page.
- **Never re-seed the editor with the whole live log string.** Replacing the document
  (`changes: { from: 0, to: doc.length }`) resets the scroll offset and collapses the selection;
  at one flush per 150 ms the log appears to jump back to the top and nothing can be selected.
  `streamed-log-view.state.svelte.ts` appends the delta instead — that is the entire reason it exists.
  This is also why the CodeMirror mount is an attachment: the editor is an outside system, and a
  `value` prop would invite exactly the replacement above.
- **Never scroll that viewer to the bottom on every log change** either — same flush rate, and it
  steals the viewport from a user who scrolled up or is dragging a selection. The same file owns
  that decision.
- **The page fills the viewport, and only the log scrolls.** The viewer takes the height of its
  pane (`h-full`, the editor `absolute inset-0`). Do not give the editor a fixed height.
- Lists go through `DataTable` + pagination. Row keys are job ids, never indices.
- **`jobQueries.byPipeline` keeps the rows while another page of the same pipeline loads**
  (`placeholderData`; not across a change of `filter`). The page size comes from the height of the table area, and
  `NoAgentsBanner`, above that area, reads the rows. Without the rows, the banner goes, the area
  gets taller, and the page size changes again: the page sends more calls, and the browser
  reports "ResizeObserver loop completed with undelivered notifications".
- **Re-run is on an ended job only** (`isFinishedStatus`), in the jobs table and in the job
  details header, and only with `CREATE_JOB` (`rerun_job` on the server, not `run_pipeline`).
  The new job runs the nodes and the inputs of the old job, not the pipeline as it is now. `jobMutations.rerun` refreshes the list and opens the
  new job. The action is disabled while the mutation is pending, so a double click makes one job.
- **A node shows `Attempt N/M` only when it can retry and it started** (`attemptOf`: `M > 1` and
  `N > 0`), in its row of the list.
- **The details page is the one place a job's logs are read.** Everywhere a job is displayed —
  the jobs table's view action and timeline, the bars of the pipeline dashboard's history —
  links there through `scyllaNavigate.goToJobDetails(...)` from `@platform/context`, which is an
  object. The view of the log is in the URL, not in component state
  (`job-log-place.state.svelte.ts`), so a link or a shared URL opens the same view:
  `?node=<id>` (or `node=all` for the whole job), `?fullscreen=1`, and `#L<line>` for a line. An
  old link with `?nodes=a,b` opens the first of its nodes in the order of the list. A change of
  node drops the `#L` hash (it is a line of the other log); the full screen keeps it. Keep these
  parameters when you change the page: the share button of the top bar copies the URL as it is.
- **Details is dense.** Each group (Run, Source, Report) is one row: its title, then its facts
  one after the other, on more lines only when the width is not sufficient. A fact puts its label
  and its value on one line; a long value is cut, with the whole value in its `title`. A fact with
  no value is not shown. Under 640 px, each fact is on its own line. A new fact goes in a
  `JobDetailsFact` of its group.
- **One node at a time.** The list (or the graph, as the display settings say) selects one node,
  or the whole job; the viewer shows its lines. The checkout and a skipped node are entries too:
  a skipped node shows why it did not run in place of its log.
- **The viewer writes the clean text in CodeMirror, and the styles as marks.** `parseAnsiLine`
  keeps the color codes (8 colors; 256 and true colors take the nearest of the 8), bold, dim,
  inverse and OSC 8 links, and removes the other codes. `\r` keeps the last state of a line, `\b`
  removes a character. The marks (colors, errors, search, the line of the link) are built for the
  visible lines only. With the ANSI colors off, the search and the errors still show.
- **An error line** matches an error pattern (`log-lines.presenter.ts`), or is red on `stderr`.
  `E` and `Shift+E` go from one to the next, as the buttons of the toolbar do.
- **The shortcuts** (`/`, `E`, `Shift+E`, `F`, `Escape`) do nothing while the focus is in a field,
  a menu or a dialog, or with Ctrl, Cmd or Alt. Each one also has a labeled button.
- **The display settings** (ANSI, wrap, timestamps, line numbers, size, list or graph) are in
  `localStorage` under `scylla.job-log.display`, and the width of the list under
  `paneforge:scylla.job.log-split`. Both are in the tracker registry.
- **The line numbers are links**, out of the tab order: CodeMirror hides its gutters from
  assistive technology. A plain click writes `#L<line>` in the URL and marks the line.
- **New strings go in `messages/jobs.messages.ts` (or `job-log.messages.ts` for the viewer), never
  inside a `.svelte`.** Extraction does not read components, so a message declared there vanishes
  from the catalogs without failing a gate.
- **This module never imports `pipeline`.** `pipeline` imports `jobs` (the keys, `loadJobsPage`,
  `jobsByPipelinesQueries`), and `pnpm depcruise:cycles` refuses the module cycle, also for a
  type. So the graph of a job has its own snapshot type (`JobNode`: id, kind, needs, the ports of
  a switch), its own proto mapping (`grpc-job.mapper.ts`) and its own column layout
  (`job-graph.presenter.ts`), with the rule of the editor: one column per stage, the targets of a
  switch in the order of its ports.
- **The path of a job follows the run rule of the agent** (`jobPath`). A need with no port opens
  when its node completed, a port of a switch when the switch chose it (`ports` of the run), `error`
  when a node that runs a step failed after its last attempt; a cancelled node opens nothing, and a
  node that has not ended leaves its needs `waiting`. A skipped node is `not-taken` when a closed
  port, or a need on a node not taken, closed its path, else `stopped` (another node failed): the
  list says "Not taken: the path did not reach it." or the text of a failure. There is no
  `NodeStatus` for it: the server says `SKIPPED` for both.
- **The graph is read-only and follows the same query as the list** (`jobQueries.byId`, the
  3-second poll). No drag, no link, no delete. Its nodes carry their size
  (`initialWidth`, `initialHeight`), so the view fits at the load, before xyflow measures them, and
  `keepFitted` (`@scylla/ui`) fits again at a resize until the user moves the view. A node is a
  button: a click shows its log, and the node of the log has a ring. A job with no snapshot node
  shows no graph, and the list has no List / Graph switch.
- **`data-tour` attributes are anchors of the onboarding tour** (`job-details` on the job page). Keep them on the same
  element when you move markup. See [`features/onboarding`](../onboarding/AGENTS.md#anchors).

## The figures of the jobs (`GetJobStats`)

- **The success rate is completed / (completed + failed + orphaned).** A cancelled job does not
  count. No such job gives `null`, not 0 %. `successRateChange` gives the change in points.
- **`jobQueries.stats` and `jobQueries.newest` read a period when they run.** The caller gives a
  `PeriodScope`: `scope` goes in the key (the name of the period), `range()` gives the instants
  in `queryFn`. The instants of a preset move with the clock: in a key, they make a new cache
  entry for each render.
- **The keys are under `['jobs', 'workspace', id]`**, thus a run or a cancel that invalidates
  `JOBS_QUERY_ROOT` also refreshes the figures.
- **A group by origin has no id.** The domain does not ask for it, and the mapper drops it.
- The server needs the same permission as the jobs of the workspace: gate on
  `LIST_JOBS_BY_WORKSPACE`.

## The Git context of a job

- **The Git context only adds parts** (decision 19 of the Git integration): the branch, the commit
  and its author in the facts, the groups Source and Report in Details (only for a job with a
  commit), then the approval block or the invalid-file block at the place of the error box,
  between the header and the log.
- **The checkout is a step, not a node.** `stepsOf` puts it first in the timeline and the log
  list, with "built in". Its log lines have the node id `.checkout`, so `?node=.checkout` opens
  it. `job.nodeExecutions` stays the nodes of the pipeline: the lists and the dashboard read it.
- **`awaiting_approval` is a status of `@shared`**: neither active nor finished. "Approve and
  run" and "Reject" need `APPROVE_JOB`; a reader sees who can decide. The answer of the server
  replaces the job in the cache.
- **A failed job with `fileErrors` is an invalid pipeline file**: its own status label, and the
  errors with their place replace the reason of the failure.
- **A job keeps the labels of its pipeline** (`agentLabels`, from the server at its creation).
  The group Run of Details shows them (`AgentLabels` of `@shared/presentation/ui`). A
  pending job with `NO_AGENT_WITH_LABELS` names them in its status hint: no online agent has
  each of them.
- **The reports come from `integrations`** (`vcsReportQueries.byJobs`), only for the jobs with a
  commit: no call for a job or a page with none. "Retry now" needs `UPDATE_JOB` (`retry_job_report`
  is in `jobs.edit`); "Fix the connection" opens the Integrations page with `VIEW_INTEGRATIONS`.
- **The Source column shows only when a job of the page has a commit.**
- **Every column of the jobs table has a size**: the free width goes to the columns in proportion
  to it, and Source and Timeline get the most. The sum of the `minSize` values is the width under
  which the table scrolls: keep it under 900 px.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
