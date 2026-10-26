# `features/project` — agent guide

Projects: the unit that owns pipelines, secrets and its own member list.

**Layer** `features/` · **id** `project` · **DI key** `projectRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

**Presentation is Svelte** (Phase 2 of `refacto_svelte.md`). Domain and infrastructure are
unchanged. There is no `use-<feature>-domain.ts` and no hooks: reads and writes are declared as
options objects in `presentation/*.queries.ts`, which a component or another feature runs with
`createQuery`.

## Public API — `index.ts`

```typescript
type ProjectEntity, ProjectLookupEntry
projectQueries        byOrganization (paginated) · lookup (org-wide) · members
projectLookupQueries  the batched fan-out: { queries, combine } for useQueries/createQueries
projectMutations      create · update · remove
canListProjects, invalidateProjectMembers
PROJECTS_QUERY_KEY, PROJECTS_QUERY_ROOT, PROJECTS_LOOKUP_PAGE, PROJECT_MEMBERS_QUERY_KEY
CREATE_PROJECT_MUTATION_KEY   // the key of projectMutations.create; onboarding follows it
```

`shell`, `roles`, `membership` and `dashboard` all run these with `createQuery` /
`createQueries`, which keeps the three ways of reading an organization's projects on one cache
entry.

Never add: `project.module.ts`, pages.

## Data contract

`ProjectRepository` — `domain/repository/project.repository.ts`:

| Method | Returns |
|---|---|
| `getByOrganizationId(organizationId, pagination?)` | `ProjectList` |
| `listMembers(projectId)` | `UserSummary[]` (from `user`): the holders of a project-scoped grant |
| `create(name, organizationId, description?)` | `ProjectEntity` |
| `update(projectId, name?, description?)` | `ProjectEntity` |
| `delete(projectId)` | `void` |

Reach it with `useProjectDomain()` **inside a hook only**.

## Layout

```
project.module.ts                    route + nav + DI wiring (private; registry only)
index.ts                             public API
domain/
  entities/project.entity.ts         ProjectEntity, ProjectList
  repository/project.repository.ts
infrastructure/
  default-project.repository.ts      ProjectServiceClient → ProjectEntity; toCreateProjectError
  grpc-project.mapper.ts
  grpc-project-member.mapper.ts
presentation/
  project.queries.ts                 every read and write, plus the key factories
  ui/Project.page.svelte             picks the organization, or says there is none
  ui/ProjectList.svelte              keyed on the organization — that is the page reset
  ui/ProjectHeader.svelte, ProjectCard.svelte
  ui/AddProjectDialog.svelte, EditProjectDialog.svelte
  messages/project.messages.ts
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `organization` | `projects` | `READ_ORGANIZATION` | `ProjectPage` |

Sidebar: section `organization`, order `20`, icon `WorkflowIcon`. The route also declares the
"Projects" crumb, which shows on every project page.

`READ_ORGANIZATION` is the real gate — listing projects *is* reading the organization. Deeper
project routes (the `project` mount) are declared by the modules that own them
([pipeline](../pipeline/AGENTS.md), [secret](../secret/AGENTS.md),
[membership](../membership/AGENTS.md)), not here.

## Rules that bite here

- **Three ways to read an organization's projects, one cache.** `projectQueries.byOrganization`
  (the paginated list), `projectQueries.lookup` (one page of every project: the dashboard, the
  agents) and `projectLookupQueries` (the grant labels of `roles`, across organizations) are all
  in `project.queries.ts`, so no other module builds a project query of its own. Add the fourth
  here too.
- `projectLookupQueries` gives the options of each organization to `createQueries`: one batch,
  never a loop of `createQuery`.
- `listMembers` gives `UserSummary` values of [`user`](../user/AGENTS.md), and the list means
  *holders of a project-scoped grant*, not a stored roster. The member UI belongs to [`membership`](../membership/AGENTS.md); this module
  supplies the raw list only.
- Lists use `DataTable` + `createPagination()`; row keys are project ids.
- **`data-tour` attributes are anchors of the onboarding tour** (`projects` on the list, `project-card` with
  `data-project-id` on each card). Keep them on the same
  element when you move markup. See [`features/onboarding`](../onboarding/AGENTS.md#anchors).
- **A project cap comes from an extension.** `CreateProject` can fail with `RESOURCE_EXHAUSTED`
  and an English server text that names the organization by id. The repository maps it to
  its own sentence (`toCreateProjectError`) and keeps the code; the global toast shows it.
- The description is optional in both dialogs (`optional: true`).

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
