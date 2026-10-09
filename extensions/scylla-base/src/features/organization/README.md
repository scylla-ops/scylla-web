# Organization

> [Scylla frontend](../../../../../README.md) › `features/` › **organization** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

The organization is Scylla's top-level tenant. Everything else — projects, pipelines, agents,
roles — lives inside one. Every authenticated URL starts with `/:organizationSlug`, and this
module owns the entity behind that segment.

## What it covers

- **The organization list**, in two flavours: `getMine()` for the switcher and `getAll()` for
  administrative views. Keeping them separate matters — the switcher must never offer an
  organization the user cannot enter.
- **Creating, renaming and deleting** an organization.
- **Its members**, as `UserSummary` values of [user](../user/README.md) (the RPC carries an id
  and a username only). The rich member view (roles, direct vs inherited,
  granting and revoking) belongs to [membership](../membership/README.md).
- **The switcher in the app shell.**

## Two pieces the shell depends on

`OrganizationList` and `AddOrganizationDialog` are exported from the module's public API, which
is unusual for components. The reason is the context selector: the header switcher in
[shell](../../shell/README.md) is built from them.

That makes them part of this module's contract rather than internals. Changing their props is a
breaking change for the shell, and `ContextSelector` has to be updated in the same commit.

Note the direction of the dependency. `shell` imports `organization`, never the reverse — a
feature may not import the shell. The switcher's *state* (which organization is active) lives in
[platform/context](../../platform/context/README.md), below both, which is what lets any module
ask "which org am I in?" without depending on this one.

## No route of its own

`OrganizationModule` declares no route. Its data shows in the pages of other modules: the
switcher of the shell, the members pages of [membership](../membership/README.md), the
organizations and roles of a user in [user](../user/README.md). A user's page reads those from
`ListUserAccess` of the user service, so it does not need this module.

## Structure

**Domain** is a single entity and a three-method repository. **Infrastructure** carries two
mappers — one for the organization, one for its members — because `listMembers` returns user
identities rather than organization data.

**Presentation** holds one hook per operation and the dialogs. Two hook files
(`useOrganizations.ts`, `useCreateOrganization.ts`) are still camelCase, from before the
kebab-case convention. They are left alone deliberately: renaming a file moves its Lingui
message ownership and silently drops translations unless the restore script is run. New hooks
here use `use-{name}.ts`.

## Related modules

- [membership](../membership/README.md) — members with their roles, at org and project scope.
- [project](../project/README.md) — what an organization contains.
- [user](../user/README.md): the `UserSummary` type of the members.
- [shell](../../shell/README.md) — renders the switcher.
- [platform/context](../../platform/context/README.md) — holds the active organization.
