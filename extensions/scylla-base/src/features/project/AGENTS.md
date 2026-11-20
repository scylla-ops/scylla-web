# `features/project` — agent guide

Projects: the unit that owns pipelines, secrets and its own member list.

**Layer** `features/` · **id** `project` · **DI key** `projectRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

Reads and writes are declared as options objects in `presentation/*.queries.ts`, which a
component or another feature runs with `createQuery`.

## Public API — `index.ts`

```typescript
type ProjectEntity, ProjectList, ProjectLookupEntry
projectQueries        byWorkspace (paginated) · lookup (org-wide) · byId (one project, or null) · members
projectLookupQueries  the batched fan-out: { queries, combine } for useQueries/createQueries
projectMutations      create · update · remove
canListProjects
PROJECTS_QUERY_KEY, PROJECTS_QUERY_ROOT, PROJECTS_LOOKUP_PAGE
CREATE_PROJECT_MUTATION_KEY   // the key of projectMutations.create; onboarding follows it
```

`shell`, `roles`, `membership` and `dashboard` all run these with `createQuery` /
`createQueries`, which keeps the three ways of reading an workspace's projects on one cache
entry.

Never add: `project.module.ts`, pages.

## Data contract

`ProjectRepository` — `domain/repository/project.repository.ts`:

| Method | Returns |
|---|---|
| `getByWorkspaceId(workspaceId, pagination?)` | `ProjectList`: a `PaginatedList<ProjectEntity>` (`items`, `pagination`) |
| `getById(projectId)` | `ProjectEntity`, or `null` when the server refuses the id: see the rules below |
| `create(name, workspaceId, description?)` | `ProjectEntity` |
| `update(projectId, name?, description?)` | `ProjectEntity` |
| `delete(projectId)` | `void` |

Reach it from `presentation/project.queries.ts` only, never from a component.

## Layout

```
project.module.ts                    route + nav + DI wiring (private; registry only)
index.ts                             public API
domain/
  entities/project.entity.ts         ProjectEntity, ProjectList
  repository/project.repository.ts
infrastructure/
  default-project.repository.ts      ProjectServiceClient → ProjectEntity; the project cap
  grpc-project.mapper.ts
presentation/
  project.commands.ts                "Create project...", for the search bar: it opens projects/new
  project.queries.ts                 every read and write, plus the key factories
  ui/Project.page.svelte             picks the workspace, or says there is none
  ui/ProjectList.svelte              keyed on the workspace — that is the page reset
  ui/ProjectHeader.svelte, ProjectCard.svelte
  ui/EditProjectDialog.svelte
  ui/NewProject/                     the choice of the kind of project: ProjectKindCard per way
  ui/NewRegularProject/              the name and the description of a regular project
  messages/project.messages.ts
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `workspace` | `projects` | `READ_WORKSPACE` | `ProjectPage` |
| `workspace` | `projects/new` | `CREATE_PROJECT` | `NewProjectPage` |
| `workspace` | `projects/new/regular` | `CREATE_PROJECT` | `NewRegularProjectPage` |

Sidebar: section `workspace`, order `20`, icon `WorkflowIcon`. The route also declares the
"Projects" crumb, which shows on every project page.

`READ_WORKSPACE` is the real gate — listing projects *is* reading the workspace. Deeper
project routes (the `project` mount) are declared by the modules that own them
([pipeline](../pipeline/AGENTS.md), [secret](../secret/AGENTS.md),
[membership](../membership/AGENTS.md)), not here.

`projects/new/github`, the project linked to a GitHub repository, is a page of
[integrations](../integrations/AGENTS.md): this module cannot import `integrations`. The
choice card links to it by its path only.

## Rules that bite here

- **Three ways to read an workspace's projects, one cache.** `projectQueries.byWorkspace`
  (the paginated list), `projectQueries.lookup` (one page of every project: the dashboard, the
  agents) and `projectLookupQueries` (the grant labels of `roles`, across workspaces) are all
  in `project.queries.ts`, so no other module builds a project query of its own. Add the fourth
  here too.
- `projectLookupQueries` gives the options of each workspace to `createQueries`: one batch,
  never a loop of `createQuery`.
- The member UI and its data belong to [`membership`](../membership/AGENTS.md), through `access`.
- Lists use `DataTable` + `createPagination()`; row keys are project ids.
- **`data-tour` attributes are anchors of the onboarding tour** (`projects` on the list, `project-card` with
  `data-project-id` on each card, `regular-project` on the card of a regular project,
  `add-project-form` around the form of `projects/new/regular`). Keep them on the same
  element when you move markup. See [`features/onboarding`](../onboarding/AGENTS.md#anchors).
- **A project cap comes from an extension.** `CreateProject` can fail with `RESOURCE_EXHAUSTED`
  and an English server text that names the workspace by id. The repository maps it to
  its own sentence in `create` and keeps the code; the global toast shows it.
- The description is optional in the edit dialog and on the new project page (`optional: true`).
- **A new project is a page, not a dialog.** "New project" in the header and the command of the
  search bar open `projects/new`. The GitHub card stays inert, with its reason, for a person
  without `MANAGE_REPOSITORY_LINK` on the workspace.
- **`projectMutations.update` also writes `contextStore`** when the project is the active one. The
  crumb, the sidebar title, the members page of the project and the search bar read that copy of the
  name. No effect that follows the list is mounted on the project list, so the mutation must write it.
  On a project page, [`cleanContext`](../../shell/AGENTS.md) also keeps it equal to the server.
- **`projectMutations.update` refetches with `refetchType: 'all'`.** The dashboard and the search bar
  read lists that no component has mounted during the rename. A default refetch skips these lists,
  and the old name shows for one fetch when the next page opens.
- **To find one project, use `projectQueries.byId`, not a list.** A list is cut into pages, so a
  project that is not on a page can still exist.
- **`getById` gives `null` for `PERMISSION_DENIED` and `INVALID_ARGUMENT`.** The server answers an
  unknown id as a refusal, and a text that is not an id as an invalid argument. `null` thus means
  "this caller cannot have this project", not "it does not exist". Any other error stays an error.
  With no other proof, do not read `null` as "gone": see [`cleanContext`](../../shell/AGENTS.md).
- **`projectMutations.remove` clears the project and the pipeline of `contextStore`** when the project
  is the active one, for the same reason as `update`: no `cleanContext` is mounted on the list. The
  search bar reads the store there.
- **`projectMutations.remove` and `update` write the read of the project only if a read made it**
  (`setQueriesData`, not `setQueryData`). An entry that a write makes has no `queryFn`, and
  `refetchType: 'all'` fails on it. After a delete, this `null` lets a browser back leave at once:
  the page of the project does not mount.
- **A delete does not refresh the pipelines of the search bar.** `pipelineQueries.allOfWorkspace` keeps
  a pipeline of the deleted project for up to 30 seconds (`staleTime`). This module cannot invalidate
  it: `pipeline` reaches `project` through `apps`, so an import makes a module cycle. A click on this
  row goes to the list.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
