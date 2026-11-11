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

## Why one module holds the four services

The repository page of a project, the merge rules and the reports of a run come in later
changes. They use the same connections, links and provider states, so their data layer is here
from the start: one repository and one mapper for each gRPC service, so that the later pages add
only their views.
