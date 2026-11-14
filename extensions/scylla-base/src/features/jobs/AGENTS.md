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
type JobLog, JobLogStream
type JobsSummary, JobStatus
summarizeJobs, isActiveStatus, isFinishedStatus
JOBS_QUERY_KEY, WORKSPACE_JOBS_QUERY_KEY, JOBS_QUERY_ROOT
jobQueries, asJobFeed, WORKSPACE_JOBS_WINDOW
jobsByPipelinesQueries
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
  entities/job.entity.ts             JobEntity, JobFilter, JobEvent, JobNodeExecution,
                                     NodeExecutionState, JobLog, JobLogStream, and the Git
                                     context: JobSource, JobApproval, PipelineFileRef,
                                     PipelineFileError, JobCheckout
  repository/jobs.repository.ts
infrastructure/
  default-jobs.repository.ts       JobServiceClient → JobEntity; tailLogs maps the stream
  grpc-job.mapper.ts
presentation/
  jobs.query-keys.ts                 key factories — import these, never inline a key
  jobs.queries.ts                    every read and write, as query/mutation options
  jobs-by-pipelines.queries.ts       the fan-out across pipelines, avoids N+1
  ui/Jobs.page.svelte, JobsHeader.svelte
  ui/JobDetails/                     one job: info + per-node logs (JobSummary, JobNodeLogs)
    JobSourceFacts.svelte                  the commit band: repo, ref, SHA, PRs, author, fork,
                                           event, pipeline file, approval decision
    JobReportsBand.svelte                  one row for each report to the provider, its retry
    JobApprovalBlock.svelte                Approve and run / Reject of a job from a fork
    InvalidFileAlert.svelte                the errors of an invalid pipeline file
    open-log-panels.state.svelte.ts        which node panels are open, mirrored in the URL
  ui/jobs-table/JobSource/           the Source cell, two lines: author and title, then SHA with
                                     the report icon, ref, PRs
  messages/jobs.messages.ts                every string — `lingui extract` cannot read `.svelte`
  messages/job-git.messages.ts             the strings of the Git context of a job
  presenters/job-source.presenter.ts     the ref, the event and the PR numbers of a commit
  presenters/job-report.presenter.ts     the row and the tone of a report, the no-report reason
  presenters/job-status.presenter.ts     the label and the hint of a status (invalid file,
                                         waiting reason, approval)
  presenters/job-steps.presenter.ts      the steps of the page: the checkout, then the nodes
  presenters/job-file.presenter.ts       `path:line:column` of a file error
  presenters/jobs-summary.presenter.ts   JobsSummary, summarizeJobs
  presenters/job-timeline.presenter.ts   segment geometry, pure and tested in node
  presenters/node-attempt.presenter.ts   attemptOf: the `Attempt N/M` of a node
  ui/jobs-table/                     JobsTable + jobs-table.columns.ts + cells
  ui/jobs-log/JobLogDisplay/         the streamed viewer, shared by both pages
    streamed-log-view.state.svelte.ts      owns the editor document + tail-follow
    tail-job-logs.state.svelte.ts          the live stream subscription (opens and closes it)
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `project` | `pipelines/:pipelineId/jobs/:jobId` | `READ_JOB` | `JobDetailsPage` |

No nav entry. The jobs **list** is not declared here: it is mounted by
[`pipeline`](../pipeline/AGENTS.md) at `project` → `pipelines/:pipelineId/jobs`, gated on
`LIST_JOBS_BY_PIPELINE`, via `PipelineJobsRoute`, because that page needs a Run action. If you
change `JobsPage`'s props, that is the call site to update. `pipeline` also gives the page a
`filter` (a `JobFilter`: branch, event, author login, pull request) and a `toolbar` snippet with
the controls of the filter, rendered under the header. A job with no commit matches no filter.
With a filter that matches no job, the empty list does not tell the user to run the pipeline.

One job needs nothing from `pipeline`, so its route lives here, with its full path. Its page
shows the "Pipeline · Jobs" crumb of the list, because its path starts with the list's path.

## Rules that bite here

- **The reason of a failure has two places.** The page shows `job.error` in a box. The agent writes
  each failed attempt in the logs of its node (`scylla-agent: attempt <n> failed: <reason>`), so
  `run.error` is not mapped. A skipped node has no log: its panel says why, and opens no stream.
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
- **Never re-seed the editor with the whole live log string.** Replacing the document
  (`changes: { from: 0, to: doc.length }`) resets the scroll offset and collapses the selection;
  at one flush per 150 ms the log appears to jump back to the top and nothing can be selected.
  `streamed-log-view.state.svelte.ts` appends the delta instead — that is the entire reason it exists.
  This is also why the CodeMirror mount is an attachment: the editor is an outside system, and a
  `value` prop would invite exactly the replacement above.
- **Never scroll that viewer to the bottom on every log change** either — same flush rate, and it
  steals the viewport from a user who scrolled up or is dragging a selection. The same file owns
  that decision.
- **The log viewer is sized by its caller, never by itself.** `JobLogDisplay` takes a `maxHeight`
  in pixels and grows with the log up to it; the details page gives the whole job's panel the
  column it measured, and every node panel one fixed readable height whatever the count — the
  column scrolls rather than shrink them. A fixed height on the editor itself is what this
  replaced — do not put one back.
- Lists go through `DataTable` + pagination. Row keys are job ids, never indices.
- **Re-run is on an ended job only** (`isFinishedStatus`), in the jobs table and in the job
  details header, and only with `CREATE_JOB` (`rerun_job` on the server, not `run_pipeline`).
  The new job runs the nodes and the inputs of the old job, not the pipeline as it is now. `jobMutations.rerun` refreshes the list and opens the
  new job. The action is disabled while the mutation is pending, so a double click makes one job.
- **A node shows `Attempt N/M` only when it can retry and it started** (`attemptOf`: `M > 1` and
  `N > 0`), in the node list and in the node panel header.
- **The details page is the one place a job's logs are read.** Everywhere a job is displayed —
  the jobs table's view action and timeline, the pipeline dashboard's history and last run —
  links there through `scyllaNavigate.goToJobDetails(...)` from `@platform/context`, which is an
  object. Which log panels are open is the `nodes` search param, not component
  state (`open-log-panels.state.svelte.ts` owns it), so those links can open straight onto one node's
  logs.
- **The whole job and the nodes are exclusive.** The details page opens a `JobLogDisplay` per node
  the URL names, and the job as a whole only when it names none — the whole job is the page at
  rest, never a panel standing alongside the nodes, which is why its panel has no close button.
  Closing the last node panel is what comes back to it.
- **The timeline picks one node, the log nav builds a set.** A click on a timeline segment shows
  that node alone (`selectNode`) — the same jump the links from the jobs list and the pipeline
  dashboard make, landing on the page rather than moving inside it. The nav under the summary
  adds and removes panels instead (`toggleNode`), which is what lets two nodes' output be read
  side by side.
- **Log panels are independent, and each one is a live stream.** Every open panel holds its own
  tail subscription. Closing a panel unmounts it, which is what cancels that stream — never hide
  one with CSS instead.
- **New strings go in `messages/jobs.messages.ts`, never inside a `.svelte`.** Extraction does not read
  components, so a message declared there vanishes from the catalogs without failing a gate.
- **`data-tour` attributes are anchors of the onboarding tour** (`job-details` on the job page). Keep them on the same
  element when you move markup. See [`features/onboarding`](../onboarding/AGENTS.md#anchors).

## The Git context of a job

- **The page stays as it was; the Git context only adds blocks** (decision 19 of the Git integration): under the
  facts, the Source band (only for a job with a commit), the Report band, then the approval
  block or the invalid-file block at the place of the error box.
- **The checkout is a step, not a node.** `stepsOf` puts it first in the timeline and the log
  nav, with "built in". Its log lines have the node id `.checkout`, so `?nodes=.checkout` opens
  it. `job.nodeExecutions` stays the nodes of the pipeline: the lists and the dashboard read it.
- **`awaiting_approval` is a status of `@shared`**: neither active nor finished. "Approve and
  run" and "Reject" need `APPROVE_JOB`; a reader sees who can decide. The answer of the server
  replaces the job in the cache.
- **A failed job with `fileErrors` is an invalid pipeline file**: its own status label, and the
  errors with their place replace the reason of the failure.
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
