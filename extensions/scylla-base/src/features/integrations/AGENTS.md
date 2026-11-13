# `features/integrations` — agent guide

The connections of a workspace to GitHub and GitLab, the callback of the GitHub install, the
repository page of a project, and the data layer of the Git integration: the connections, the
repository links, the merge rules and the commit reports.

**Layer** `features/` · **id** `integrations` · **DI keys** `vcsConnectionRepository`,
`repositoryLinkRepository`, `mergeBlockRepository`, `vcsReportRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts` (it reads
  `workspaceQueries.mine` of `workspace` after the GitHub callback, and `projectQueries.lookup`
  of `project` to name the project that has a repository in the link picker).
- Must never import `pipeline` or `triggers`: they import this module, and the module graph has
  no cycle. The names of the reports come from the merge rules (`ListMergeBlocks` gives one row
  with its context for each pipeline on GitHub), not from the pipelines.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type VcsProvider, VcsProviderInfo, VcsConnectionEntity, ConnectionState, DeliveryMode
type RepositoryLink, ReportMode, PipelineSource, GitRef, GitRefKind
type MergeBlock, MergeBlockState, VcsReport, ReportState, JobReports
integrationsUrl(workspaceSlug, connectedId?)
repositoryLinkQueries                 the link of a project and its refs, for the pipeline and
                                      trigger pages
```

`repositoryLinkQueries` crosses the barrel: the pages of `pipeline` (the Run dialog, the filters
of the jobs, the page of a file pipeline) read the link and its refs, and the trigger pages of
`triggers` read the link (the Git kinds need one, and the provider names the pull request). They run outside the route
guard of this module, so `byProject` and `refs` check `READ_REPOSITORY_LINK` on the project with
`can(...)` (`shell/__test__/feature-permissions.test.ts`). A later page that reads
`vcsReportQueries` from another module adds the export the same way.

Never add: `integrations.module.ts`, pages, components.

## Data contract

One repository for each gRPC service of `scylla/integrations/v1`.

`VcsConnectionRepository` — `domain/repository/vcs-connection.repository.ts`:

| Method | Returns |
|---|---|
| `getProviders(workspaceId)` | `VcsProviderInfo[]` — GitHub, then GitLab, and why one is not available |
| `listByWorkspace(workspaceId)` | `VcsConnectionEntity[]` — every page, oldest first |
| `getById(id)` | `VcsConnectionEntity` |
| `startGitHubInstall(workspaceId)` | `GitHubInstall` — the install URL with a state of 10 minutes |
| `completeGitHubInstall(CompleteGitHubInstallInput)` | `VcsConnectionEntity` |
| `connectGitLab(ConnectGitLabInput)` | `CheckedGitLabConnection` — the connection and the warnings |
| `replaceGitLabToken(ReplaceGitLabTokenInput)` | `CheckedGitLabConnection` |
| `deleteById(id)` | `void` |
| `listRepositories(ListProviderRepositoriesInput)` | `ProviderRepositoryPage` — one page |

`RepositoryLinkRepository` — `getByProject` (`null` with no link), `link`, `update` (sends only
the fields that are set), `unlink`, `testDelivery`, `listRefs` (one page).
`MergeBlockRepository` — `listByProject`, `set`. `VcsReportRepository` — `listByJobs` (at most
100 jobs, no call for none), `retry`.

The inputs and the result types are in the entity files of `domain/entities/`. A value of the
wire that this build does not know: a connection of an unknown provider is not in a list, and one
connection of an unknown provider is `UNSUPPORTED_RESPONSE`. An unknown connection state reads as
`needs_attention`, an unknown merge rule state as `failed`.

## Layout

```
integrations.module.ts                 the routes and the DI wiring (private)
index.ts                               public API
domain/
  structs/vcs-provider.struct.ts       VcsProvider, VcsProviderInfo
  entities/vcs-connection.entity.ts    VcsConnectionEntity, its inputs, ProviderRepository,
                                       tokenExpiresSoon
  entities/repository-link.entity.ts   RepositoryLink, its inputs, GitRef
  entities/merge-block.entity.ts       MergeBlock, SetMergeBlockInput
  entities/vcs-report.entity.ts        VcsReport, JobReports
  repository/                          one interface for each service
infrastructure/                        Default*Repository and grpc-*.mapper.ts, one for each service
presentation/
  vcs-connection.queries.ts            the connections: reads and writes
  repository-link.queries.ts           the link of a project, its refs
  merge-block.queries.ts               the merge rules of a project
  vcs-report.queries.ts                the reports of jobs
  messages/                            integrations, connect-github, connect-gitlab, repository
  presenters/connection.presenter.ts   the texts of a connection row: kind, count, events, state
  presenters/connection-errors.presenter.ts   the refusal codes and the warnings, in words
  presenters/integrations-url.presenter.ts    the URL of the page, the `connected` parameter
  presenters/repository-link.presenter.ts     the texts of the repository page: events line,
                                              state of the link, what an unlink stops, refusals
  ui/Integrations/                     the page, its ViewModel, the provider cards, the table
  ui/ConnectGitHubDialog/              the permissions of the App, then the install on GitHub
  ui/ConnectGitLabDialog/              the guide, the token field, the result of the check
  ui/GitHubCallback/                   the page where GitHub sends the browser back
  ui/Repository/                       the repository page of a project, its ViewModel, the
                                       repository card, the reports card, the unlink dialog
  ui/LinkRepositoryDialog/             the picker: connection, search, repositories
  ui/ProviderTile.svelte               the mark of a provider in a square
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `workspace` | `settings/integrations` | `VIEW_INTEGRATIONS` | `IntegrationsPage` |
| `personal` | `integrations/github/callback` | none (`UNGATED_PAGES`) | `GitHubCallbackPage` |
| `project` | `settings/repository` | `READ_REPOSITORY_LINK` | `RepositoryPage` |

Nav: section `workspace`, group `settings`, order 61 (after General). The callback has no
permission: the server checks the state, which is bound to the workspace and to the user that
started the install. The repository page is the link "Settings" of the project section, order 90
(the last one). The trigger editor of `triggers` sends "Link a repository first" to it.

## Rules that bite here

- **The buttons that change a connection need `MANAGE_VCS_CONNECTIONS`.** A reader sees the
  page, the connections and the links to the provider, but the connect buttons are inert and the
  row menu has no Replace token and no Disconnect.
- **A GitLab token passes through once.** The dialog clears the field after the call, the
  mutation does not keep it, and no toast, log or cache gets it. A refusal shows under the
  field (`meta.showsOwnError`), in the words of `connection-errors.presenter.ts`.
- **ConnectGitLab checks and saves in one call.** There is no "check only" RPC: the dialog shows
  the result of the check (account, scopes, expiry, projects, warnings) after the save.
- **The GitHub callback runs outside a workspace.** It reads the values of the redirect from
  the query string, sends them one time (a used state is refused), then opens the page of the
  workspace of the new connection with `?connected=<id>`. The page shows the next step for this
  connection until the user dismisses it.
- **GitHub Enterprise Server and GitLab self-managed come later** (user decision 4): their cards
  and the self-managed choice of the GitLab dialog are disabled, with "Later".
- **The buttons and the controls of the repository page need `MANAGE_REPOSITORY_LINK`** on the
  project: link, unlink, the test webhook, the reports switch and the report mode. A reader sees
  the link, the events and the reports, with the controls inert.
- **A test webhook is not an error toast.** `testDelivery` has `meta.showsOwnError`: the card
  shows the result beside the events line. A server that does not serve TestDelivery yet answers
  `UNIMPLEMENTED`, and the card says "This server cannot test the webhook yet."
- **"Enable again" is the test webhook.** GitLab turns a disabled webhook on again when a test
  delivery passes, and the server goes back to webhook mode when the test arrives.
- **The link has no "change" and no default branch to set.** `UpdateRepositoryLink` changes only
  the reports and the polling. To use another repository, a person unlinks, then links.
- **The picker lists only the active connections.** A connection that stopped cannot list its
  repositories. A repository of another project shows, but cannot be picked.
- **The ProviderMark of `@shared` draws the marks** (`github`, `gitlab`). Lucide has no brand
  icon.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean. New strings: `pnpm extract && pnpm compile`, then the French text in
`locales/fr/messages.po`.
