# Workspace

> [Scylla frontend](../../../../../README.md) › `features/` › **workspace** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

The workspace is Scylla's top-level tenant. Everything else — projects, pipelines, agents,
roles — lives inside one. Every authenticated URL starts with `/:workspaceSlug`, and this
module owns the entity behind that segment.

## What it covers

- **The workspace list**, in two flavours: `getMine()` for the switcher and `getAll()` for
  administrative views. Keeping them separate matters — the switcher must never offer an
  workspace the user cannot enter.
- **Creating, renaming and deleting** an workspace.
- **Its members**, as `UserSummary` values of [user](../user/README.md) (the RPC carries an id
  and a username only). The rich member view (roles, direct vs inherited,
  granting and revoking) belongs to [membership](../membership/README.md).
- **The switcher in the app shell.** Each row has its actions, also a row that is not the active
  workspace. The permissions of the store know only the active workspace, so the list asks the
  server about each row. The server stays the authority for each call.

## Two pieces the shell depends on

`WorkspaceList` and `AddWorkspaceDialog` are exported from the module's public API, which
is unusual for components. The reason is the context selector: the header switcher in
[shell](../../shell/README.md) is built from them.

That makes them part of this module's contract rather than internals. Changing their props is a
breaking change for the shell, and `ContextSelector` has to be updated in the same commit.

Note the direction of the dependency. `shell` imports `workspace`, never the reverse — a
feature may not import the shell. The switcher's *state* (which workspace is active) lives in
[platform/context](../../platform/context/README.md), below both, which is what lets any module
ask "which org am I in?" without depending on this one.

## No route of its own

`WorkspaceModule` declares no route. Its data shows in the pages of other modules: the
switcher of the shell, the members pages of [membership](../membership/README.md), the
workspaces and roles of a user in [user](../user/README.md). A user's page reads those from
`ListUserAccess` of the user service, so it does not need this module.

## Structure

**Domain** is a single entity and a three-method repository. **Infrastructure** carries two
mappers — one for the workspace, one for its members — because `listMembers` returns user
identities rather than workspace data.

**Presentation** holds the query factories (`workspace.queries.ts`: one entry per
operation), the dialogs, and the items of the form (`presenters/workspace-form.presenter.ts`).

## Related modules

- [membership](../membership/README.md) — members with their roles, at org and project scope.
- [project](../project/README.md) — what an workspace contains.
- [user](../user/README.md): the `UserSummary` type of the members.
- [shell](../../shell/README.md) — renders the switcher.
- [platform/context](../../platform/context/README.md) — holds the active workspace.
