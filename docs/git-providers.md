# Git providers

This document tells how to set up GitHub and GitLab for a Scylla server. With a Git provider,
Scylla starts the pipelines on pushes, pull requests and tags, checks out the code on the agent,
reports the result on each commit, and can block a merge.

| Provider | What the server needs | What a workspace does |
|---|---|---|
| GitHub.com, Scylla Cloud | One public GitHub App, in the settings of the server (section 2) | An admin installs the App on an account or an organization |
| GitHub.com, self-hosted | One private GitHub App for the server: the manifest flow (section 3), or the settings (section 2) | The same |
| GitLab.com | Nothing | An admin gives the token of a service account (section 4) |

GitHub Enterprise Server and GitLab self-managed come in a later release.

The server needs these settings for all providers:

- `SCYLLA_APP_URL`: the public URL of the web app. GitHub sends the browser back to it.
- `SCYLLA_API_URL`: the public URL of the server. GitHub and GitLab send the webhooks to it.
- `SCYLLA_SECRET_KEY`: the key that seals the secrets of an App of the instance and the GitLab
  tokens. With no key, a workspace cannot connect GitLab, and an instance admin cannot create the
  GitHub App.

---

## 1. What the GitHub App asks for

Each GitHub App of Scylla has these permissions and events. The manifest flow sets them. Set
them by hand when you register the App yourself.

| Repository permission | Access | Why |
|---|---|---|
| Checks | Read and write | The check run of each pipeline |
| Commit statuses | Read and write | The commit status of each pipeline |
| Contents | Read-only | The checkout, the pipeline files, the heads of the branches for the polling, the `push` events |
| Pull requests | Read-only | The `pull_request` events, the open pull requests for the polling |
| Metadata | Read-only | Mandatory for each App |
| Administration | Read and write | Only "Block the merge": the ruleset "Scylla required checks" |

Events: **Push**, **Pull request**, **Check run** and **Check suite**. GitHub always sends the
`installation` and `installation_repositories` events.

An organization can refuse the Administration permission. Scylla then works with no merge
block: the "Block the merge" switch shows "Grant the permission on GitHub" and the steps to
do it by hand.

---

## 2. Register the GitHub App by hand

Use this procedure for Scylla Cloud, or for a self-hosted server that keeps its App in its
settings. When the server has these settings, the "Git providers" page of the instance shows
the App as read only, and the manifest flow is not available.

1. On GitHub, open **Settings > Developer settings > GitHub Apps > New GitHub App**. For an App
   of an organization, open the settings of the organization.
2. Fill the form:
   - **GitHub App name**: for example `Scylla`.
   - **Homepage URL**: the value of `SCYLLA_APP_URL`.
   - **Callback URL**: `<SCYLLA_APP_URL>/integrations/github/callback`.
   - Select **Request user authorization (OAuth) during installation**. Scylla uses the user
     token to check that the person can see the installation. GitHub then sends the browser to
     the callback URL after the install, and the "Setup URL" field stays empty.
   - **Webhook**: select **Active**. **Webhook URL**: `<SCYLLA_API_URL>/integrations/github/webhook`.
   - **Webhook secret**: a random value, for example the output of `openssl rand -hex 32`.
   - **SSL verification**: on.
   - **Permissions** and **Subscribe to events**: the values of section 1.
   - **Where can this GitHub App be installed?**: **Any account** for Scylla Cloud. **Only on this
     account** for a self-hosted server.
3. Select **Create GitHub App**.
4. On the page of the App, get the values:
   - the **App ID** and the **Client ID**;
   - the slug: the last part of the public link `https://github.com/apps/<slug>`;
   - **Generate a new client secret**, and keep it;
   - **Generate a private key**: GitHub gives a `.pem` file.
5. Set the six settings of the server, then restart it:

   | Setting | Value |
   |---|---|
   | `SCYLLA_GITHUB_APP_ID` | The App ID |
   | `SCYLLA_GITHUB_APP_SLUG` | The slug |
   | `SCYLLA_GITHUB_APP_CLIENT_ID` | The Client ID |
   | `SCYLLA_GITHUB_APP_CLIENT_SECRET` | The client secret |
   | `SCYLLA_GITHUB_APP_PRIVATE_KEY` | The text of the `.pem` file. In a `.env` file, write it on one line and replace each new line with `\n` |
   | `SCYLLA_GITHUB_APP_PRIVATE_KEY_FILE` | In place of the key: the path of the `.pem` file |
   | `SCYLLA_GITHUB_APP_WEBHOOK_SECRET` | The webhook secret |

   Set all of them, or none. A part of them, or a key that is not an RSA key, stops the start
   of the server. Keep them in a secret store.
6. Check the result: in a workspace, open **Settings > Integrations**. The GitHub card shows
   **Connect GitHub**. Connect a test organization, then open the App on GitHub: **Advanced >
   Recent Deliveries** shows the `installation` event with the answer 202.

---

## 3. Create the GitHub App of a self-hosted server (manifest flow)

On a self-hosted server with no `SCYLLA_GITHUB_APP_*` settings, an instance admin creates the
App from Scylla. GitHub makes the App from a manifest, and Scylla gets and seals its keys.

Before you start:

- Set `SCYLLA_SECRET_KEY`, `SCYLLA_APP_URL` and `SCYLLA_API_URL`.
- The browser of the admin must open github.com. The server must call `api.github.com`.

Steps:

1. Open the instance page **Git providers**. Only an instance admin sees it.
2. Choose the owner of the App: **My GitHub account**, or **Organization** with its login. For
   an organization, GitHub must allow you to create its Apps (an owner of the organization).
3. Read the **Public URL of Scylla**. GitHub sends the webhooks to it.
4. Select **Create GitHub App**. GitHub shows the App with its name, its URLs, its permissions
   and its events. Confirm the creation on GitHub.
5. GitHub sends the browser back to Scylla (`/integrations/github/manifest`). Scylla converts
   the code of GitHub within one hour, and seals the client secret, the private key and the
   webhook secret. The page shows the App: its name, its App ID, its webhook URL
   (`<SCYLLA_API_URL>/integrations/github/<id>/webhook`) and its last webhook delivery.
6. The workspaces can now connect GitHub with this App.

**Remove** on the page removes the App from Scylla. Each GitHub connection of the App becomes
disconnected in its workspace. The App stays on GitHub: delete it there.

---

## 4. Connect GitLab.com with a service account

Scylla uses the token of a service account. The service account is the author of the reports,
of the project webhooks and of the deploy tokens of the checkout. No person signs in with
OAuth.

1. In the top-level group on GitLab.com, open **Settings > Service accounts**. Only an Owner of
   the top-level group can do this. GitLab Free allows up to 100 service accounts for each
   top-level group.
2. Select **Add service account**. Give it a name, for example `scylla-bot`.
3. Add the service account as a member with the role **Maintainer**, to the group or to each
   project. The role **Developer** is enough for the reports only: Scylla then cannot create the
   webhook (it polls the project), cannot set "Pipelines must succeed", and cannot create the
   deploy tokens of the checkout.
4. On the **Service accounts** page, open the menu of the account, select **Manage access
   tokens**, then **Add new token**:
   - **Scopes**: `api`.
   - **Expiration date**: at most 365 days. Scylla shows the date, and tells the owners and the
     admins of the workspace 14 days before it.
5. In Scylla, open **Settings > Integrations** of the workspace, select **Connect GitLab**, paste
   the token, then select **Connect**. Scylla checks the token with GitLab, then shows the
   account, the scopes, the expiry and the projects with their role.
6. Before the token expires, make a new token of the same account, and select **Replace token**
   on the connection.

---

## 5. Webhooks and polling

- Scylla checks the signature of each webhook before it writes anything. A bad signature gets
  401.
- When GitHub or GitLab cannot reach the server (for example a server behind a firewall),
  Scylla polls the linked branches and the open pull requests. The repository card of the
  project shows the polling mode and its interval (2 minutes by default). A new head starts its
  runs at the next poll. Scylla does not poll the tags.
- **Test webhook** on the repository card asks the provider for a test delivery. A delivery
  that arrives moves the link back to webhook mode. GitLab turns a disabled webhook on again
  when a test delivery passes.
- An ingress or a proxy in front of the server must let these routes reach the server with no
  sign-in: `POST /integrations/github/webhook`, `POST /integrations/github/<id>/webhook` and
  `POST /integrations/gitlab/<project>/webhook`.
