# Project

> [Scylla frontend](../../../../../README.md) › `features/` › **project** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

A project is the working unit inside an workspace. It owns pipelines, secrets and its own
member list, and it is the second segment of nearly every deep URL:
`/:org/projects/:projectId/…`.

This module owns the project entity itself — the list, the CRUD, and the card UI. What lives
*inside* a project belongs to other modules.

## What it covers

- **The projects list** at `/:org/projects`, paginated.
- **Creating, editing and deleting** a project.
- **Project members** — the raw list of principals holding a project-scoped grant. The member
  *experience* is [membership](../membership/README.md)'s.
- **Reads for other modules** — the dashboard overview and the grant-label lookup.

Access is gated on `READ_WORKSPACE`, because listing an workspace's projects is a read of
the workspace.

## Three readers, one cache entry

Three different screens need "the projects of an workspace", and all three query factories
live here, in `project.queries.ts`:

| Factory | Used by | Shape |
|---|---|---|
| `projectQueries.byWorkspace` | this module's list page | paginated |
| `projectQueries.lookup` | [dashboard](../dashboard/README.md), [agents](../agents/README.md) | one page of every project |
| `projectLookupQueries` | [roles](../roles/README.md) grant labels | batched lookup |

It would be easy to let each consumer build its own query. The rule against it exists because
two modules querying the same resource through different repositories produce two cache keys for
one thing — and a mutation invalidating one leaves the other showing stale data on screen.

So the queries live with the module that owns the resource, and consumers import the factory.
If a fourth reader appears, its factory belongs here too.

The shell asks another question: does the project of the URL exist? It uses `projectQueries.byId`,
which reads one project. A list cannot answer: it is cut into pages, and a project that is not on a
page can still exist.

`projectLookupQueries` is also the codebase's reference for batching: it resolves projects
across several workspaces with `createQueries` rather than a loop of `createQuery`, which is
what keeps the grant list from firing one request per row.

## Where the project's contents live

This module declares exactly **one** route — the projects index. Everything under
`/:org/projects/:projectId/` is declared by the module that owns that content:

- [pipeline](../pipeline/README.md) — the project index and the editor.
- [secret](../secret/README.md) — `secrets`.
- [membership](../membership/README.md) — `members`.
- [triggers](../triggers/README.md) — `pipelines/:pipelineId/triggers`.

They do it by declaring their routes under the `project` mount, and the shell grafts them there —
which is why this module does not need to know they exist, and why adding a project-scoped
screen never means editing a router file.

## Structure

Standard three layers.

## Related modules

- [workspace](../workspace/README.md) — the parent scope.
- [pipeline](../pipeline/README.md), [secret](../secret/README.md),
  [triggers](../triggers/README.md) — what a project contains.
- [membership](../membership/README.md) — the member experience.
- [platform/context](../../platform/context/README.md) — holds the active project.
