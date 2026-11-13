# Integrations

> [Scylla frontend](../../../../../README.md) › `features/` › **integrations** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

A workspace connects GitHub or GitLab one time. Then all the projects of the workspace can use
the connection: Scylla starts pipelines on pushes and pull requests, checks out the code, and
reports the result on each commit.

The page lives at `/:workspace/settings/integrations`, in the Settings group of the sidebar,
behind `VIEW_INTEGRATIONS`. The admins of the workspace (`MANAGE_VCS_CONNECTIONS`) connect and
disconnect the providers.

## Two providers, two ways to connect

- **GitHub** uses the GitHub App of Scylla. The dialog lists the permissions of the App in plain
  words, then the browser goes to GitHub. The admin picks the account and the repositories there.
  GitHub sends the browser back to `/integrations/github/callback`, and the server makes the
  connection. A redirect of GitHub can be forged, so the server checks the state of the install
  and that the user can see the installation on GitHub.
- **GitLab** uses the token of a service account, because the reports must not stop when a
  person leaves the group. The admin pastes the token. The server checks it with GitLab, saves it
  sealed, and gives the account, the scopes, the expiry and the warnings. The token never comes
  back.

GitHub Enterprise Server and GitLab self-managed come in a later release. Their cards are on the
page, disabled, so that a user of these hosts knows that they are planned.

## The state of a connection

A connection is Active, Suspended, Needs attention or Disconnected. The row gives the reason in
words and the one action that repairs it: install the App again, configure it on GitHub, or
replace the GitLab token. A connection that stopped also shows in a banner at the top of the
page, with the number of projects whose reports, triggers and checkouts stopped.

## The repository of a project

A project has one repository (user decision 6). The page is at
`/:workspace/projects/:project/settings/repository`, behind `READ_REPOSITORY_LINK`, and the
editors of the project (`MANAGE_REPOSITORY_LINK`) change it.

- **No link:** the empty state and "Link a repository". The picker takes an active connection of
  the workspace, searches its repositories on the provider, and links one.
- **A link:** the repository card gives the repository, the connection, the default branch and
  how Scylla learns about the new commits: webhooks with the time of the last event, or polling
  with the reason (the provider cannot reach the server, the GitLab role is too low, GitLab
  disabled the webhook). "Test webhook" asks the provider for a test delivery. When the link
  stopped, the card says why and where to repair it.
- **Reports:** a switch, and on GitHub the choice between a check run and a commit status. The
  names of the reports are the names of the merge rules of the pipelines.
- **Unlink:** a danger zone. The dialog lists what stops: the Git triggers, the checkout, the
  reports, the merge rules, the file pipelines and the GitLab webhook.

- **Pipeline source:** the Scylla editor or the files of the repository (user decision 7, one
  source for each project). With the files, the card lists the files found on the default branch
  with "Valid" or the count of their errors. A move goes through a dialog: before a move to the
  files, it lists the files and their errors, because the editor pipelines become archived (read
  only, triggers stopped, runs kept). A move back restores them and hides the file pipelines.
- **Block the merge:** GitHub has one switch for each pipeline (a check `scylla/<key>` in the
  ruleset "Scylla required checks"), GitLab one for the project ("Pipelines must succeed"). A
  switch shows what is on the provider. Each state tells what to do: grant the permission on
  GitHub or give the Maintainer role on GitLab (with the steps by hand), apply again a rule that
  someone changed, or try again after a failure. GitHub Free allows no rule on a private
  repository.

## Why one module holds the four services

The repository page of a project, the merge rules and the reports of a run use the same
connections, links and provider states, so their data layer was here from the start: one
repository and one mapper for each gRPC service, so that each page adds only its views.
