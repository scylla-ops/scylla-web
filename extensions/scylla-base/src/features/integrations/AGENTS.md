# `features/integrations` — agent guide

The connections of a workspace to GitHub and GitLab, the callback of the GitHub install, the
repository page of a project, the GitHub App of a self-hosted server (the instance page "Git
providers" and the callback of the manifest flow), and the data layer of the Git integration:
the connections, the repository links, the merge rules, the commit reports and the App.

**Layer** `features/` · **id** `integrations` · **DI keys** `vcsConnectionRepository`,
`repositoryLinkRepository`, `mergeBlockRepository`, `vcsReportRepository`,
`pipelineSourceRepository`, `vcsAppRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts` (it reads
  `workspaceQueries.mine` of `workspace` after the GitHub callback, and `projectQueries.lookup`
  of `project` to name the project that has a repository in the link picker).
- Must never import `pipeline` or `triggers`: they import this module, and the module graph has
  no cycle. The names of the reports come from the merge rules (`ListMergeBlocks` gives one row
  with its context for each pipeline on GitHub), not from the pipelines. The pipeline files and
  the source of a project come from a client of `PipelineService` of its own
  (`pipelineSourceRepository`). A move of the source refreshes the queries of `pipeline` and
  `triggers` by their roots (`['pipelines']`, `['pipeline']`, `['triggers']`), written in
  `pipeline-source.queries.ts`: change them there when those keys change.
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

One repository for each gRPC service of `scylla/integrations/v1`, and one for `VcsAppService` of
`scylla/platform/v1`.

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
100 jobs, no call for none), `retry`. `PipelineSourceRepository` — on `PipelineService`:
`listFiles` (the files of the head of the default branch, with no text: their errors and the
sections of `on`), `setSource`.

`VcsAppRepository` — `domain/repository/vcs-app.repository.ts`: `get` (`null` with no App),
`startGitHubManifest(organization)` (the page of GitHub and the manifest, with a state of one
hour; an empty organization is the account of the person), `completeGitHubManifest`, `remove`.

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
  entities/vcs-app.entity.ts           VcsAppEntity, GitHubManifest, CompleteGitHubManifestInput
  structs/github-organization.struct.ts   the login of a GitHub organization and its issue
  structs/pipeline-files.struct.ts     PipelineFiles, FoundPipelineFile, PipelineFileIssue,
                                       blockingIssues
  repository/                          one interface for each service
infrastructure/                        Default*Repository and grpc-*.mapper.ts, one for each service,
                                       and the pipeline source on PipelineService
presentation/
  vcs-connection.queries.ts            the connections: reads and writes
  repository-link.queries.ts           the link of a project, its refs
  merge-block.queries.ts               the merge rules of a project
  pipeline-source.queries.ts           the pipeline files of a project, the move of its source
  vcs-report.queries.ts                the reports of jobs
  vcs-app.queries.ts                   the GitHub App of the server: read, manifest flow, remove
  messages/                            integrations, connect-github, connect-gitlab, repository,
                                       merge-block, pipeline-source, git-providers
  presenters/connection.presenter.ts   the texts of a connection row: kind, count, events, state
  presenters/connection-errors.presenter.ts   the refusal codes and the warnings, in words
  presenters/integrations-url.presenter.ts    the URL of the page, the `connected` parameter
  presenters/repository-link.presenter.ts     the texts of the repository page: events line,
                                              state of the link, what an unlink stops, refusals
  presenters/merge-block.presenter.ts  a merge rule: its switch, state, page, steps by hand
  presenters/pipeline-files.presenter.ts      the files of a branch: heading, state of each
  presenters/vcs-app.presenter.ts      the App: its line, its last webhook, the refusals of the
                                       manifest flow
  ui/Integrations/                     the page, its ViewModel, the provider cards, the table
  ui/ConnectGitHubDialog/              the permissions of the App, then the install on GitHub
  ui/ConnectGitLabDialog/              the guide, the token field, the result of the check
  ui/GitHubCallback/                   the page where GitHub sends the browser back
  ui/Repository/                       the repository page of a project, its ViewModel, the
                                       repository card, the reports card, the pipeline source
                                       (card, file list, move dialog, its state), the merge
                                       rules (card, row), the unlink dialog
  ui/LinkRepositoryDialog/             the picker: connection, search, repositories
  ui/GitProviders/                     the instance page: the creation form, the App block, the
                                       remove dialog, the post of the manifest to GitHub
  ui/GitHubManifestCallback/           the page where GitHub sends the browser after the creation
  ui/ProviderTile.svelte               the mark of a provider in a square
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `workspace` | `settings/integrations` | `VIEW_INTEGRATIONS` | `IntegrationsPage` |
| `personal` | `integrations/github/callback` | none (`UNGATED_PAGES`) | `GitHubCallbackPage` |
| `project` | `settings/repository` | `READ_REPOSITORY_LINK` | `RepositoryPage` |
| `instance` | `git-providers` | `MANAGE_GIT_PROVIDERS` | `GitProvidersPage` |
| `personal` | `integrations/github/manifest` | none (`UNGATED_PAGES`) | `GitHubManifestCallbackPage` |

Nav: section `workspace`, group `settings`, order 61 (after General). The callback has no
permission: the server checks the state, which is bound to the workspace and to the user that
started the install. The repository page is the link "Settings" of the project section, order 90
(the last one). The trigger editor of `triggers` sends "Link a repository first" to it. The
Git providers page is in the section `instance`, order 60 (after Settings). The manifest callback
has no permission for the same reason as the install callback: the server checks
`complete_git_hub_manifest` and the state, which is bound to the admin that started the flow.

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
- **The pipeline source changes only after the dialog.** The radio keeps the current source; a
  choice opens the move dialog, which lists the files of the default branch with their errors
  before a move to the files. A refusal shows in the dialog (`meta.showsOwnError`). The files
  are read only for a project on files, or while that dialog is open.
- **The switch of a merge rule is the rule on the provider, not the wanted value.** A rule that
  needs a permission or is not possible shows off; a failed change keeps the value before it
  (decision 110 of the core: a refusal changes nothing on the provider). A click sends the
  value again, so it is also the retry after a grant. One change at a time: the other switches
  wait, and the answer replaces its row before the list reads the provider again.
- **GitHub has one rule for each pipeline, GitLab one for the project** (no `pipelineId`).
  "Needs permission" gives the page of the grant (GitHub installation, GitLab members) and the
  steps by hand, with the check to copy on GitHub.
- **The link has no "change" and no default branch to set.** `UpdateRepositoryLink` changes only
  the reports and the polling. To use another repository, a person unlinks, then links.
- **The picker lists only the active connections.** A connection that stopped cannot list its
  repositories. A repository of another project shows, but cannot be picked.
- **The manifest goes to GitHub in a form post.** `StartGitHubManifest` gives the page of GitHub
  and the manifest; the page renders a hidden form with the field `manifest`, and its attachment
  posts it. GitHub sends the browser to `/integrations/github/manifest?code=…&state=…`, and the
  callback sends the values one time, then opens the Git providers page of the active workspace
  (else of the first workspace).
- **The App of the settings is read only.** On a server with `SCYLLA_GITHUB_APP_*` (the cloud),
  `GetVcsApp` gives the App with `managedBySettings`: the page shows it with no form and no
  Remove. The nav link cannot hide by data: only the instance admins see it.
- **The ProviderMark of `@shared` draws the marks** (`github`, `gitlab`). Lucide has no brand
  icon.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean. New strings: `pnpm extract && pnpm compile`, then the French text in
`locales/fr/messages.po`.
