# `features/pipeline` — agent guide

Pipelines: their definition, their editor, and the metadata the overviews read.

**Layer** `features/` · **id** `pipeline` · **DI keys** `pipelineRepository`, `stepTemplateRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type PipelineEntity
type PipelineMetadata, PipelineStep, PipelineIdentity
PIPELINES_QUERY_KEY, ORGANIZATION_PIPELINES_QUERY_KEY, PIPELINES_QUERY_ROOT
CREATE_PIPELINE_MUTATION_KEY, RUN_PIPELINE_MUTATION_KEY   // onboarding follows these writes
pipelineQueries                // Query options factory (replaces useOrganizationPipelines)
asPipelineFeed
```

Never add: `pipeline.module.ts`, pages — the module registry imports `.module.ts` by path,
not through the barrel.

## Data contract

`PipelineRepository` — `domain/repository/pipeline.repository.ts`:

| Method | Returns |
|---|---|
| `getMetadataByProjectId(...)` | paginated `PipelineMetadata` |
| `getMetadataByOrganizationId(...)` | paginated `PipelineMetadata` |
| `getById(id)` | `PipelineEntity` (full, with steps) |
| `create(pipeline)` | `void` |
| `edit(id, steps, name?)` | `PipelineEntity` |
| `deleteById(id)` | `void` |
| `run(id)` | `void` |

`StepTemplateRepository` — `domain/repository/step-template.repository.ts`:

| Method | Returns |
|---|---|
| `list()` | `StepTemplate[]` — the ready-made steps of the editor's palette |

`DefaultStepTemplateRepository` serves `BUILT_IN_STEP_TEMPLATES` today. When the backend
serves templates, a gRPC implementation replaces it in `pipeline.module.ts`; the palette and
`stepTemplateQueries.list()` do not change. Its key, `STEP_TEMPLATES_QUERY_KEY`, is a root of
its own: an invalidation of a pipeline key never refetches it. A template's `name` is shown as
is (a tool name such as `npm ci`), and its `icon` is a hint: an unknown hint falls back to the
kind's icon.

**`PipelineMetadata` vs `PipelineEntity` is the split that matters**: lists fetch metadata (no
steps), the editor fetches the entity. Do not make a list page call `getById`.

Reach a repository with `getModuleDomain<typeof PipelineModule.domain>('pipeline')`, in
`pipeline.queries.ts` only.

## Layout

```
pipeline.module.ts                           4 routes + DI wiring (private; registry only)
index.ts                                     public API
domain/
  entities/pipeline.entity.ts                PipelineEntity
  structs/pipeline.struct.ts                 PipelineMetadata, PipelineStep, StepDefinition, …
  structs/step-template.struct.ts            StepTemplate
  repository/pipeline.repository.ts
  repository/step-template.repository.ts
infrastructure/
  default-pipeline.repository.ts             PipelineServiceClient → PipelineEntity
  default-step-template.repository.ts        BUILT_IN_STEP_TEMPLATES
  grpc-pipeline.mapper.ts
presentation/
  pipeline.messages.ts                       i18n message descriptors
  pipeline.queries.ts                        TanStack Query options factories
  pipelines.query-keys.ts                    Query key factories (exported publicly)
  ui/
    *.page.svelte                            Pages (dashboard, creation, update, jobs route)
    run-pipeline.svelte.ts                   the Run action, shared by the dashboard and the jobs route
    editor/                                  PipelineEditor + header (with the name field), script editor
      pipeline-script.state.svelte.ts        the editor's document: script text, baseline, dirty check
      blueprint/                             the canvas, its nodes, its edge, the side panel
        blueprint.state.svelte.ts            graph ViewModel: nodes, edges, inspected step, add/insert/rename
        node-appearance.svelte.ts            the viewer's node style, remembered in localStorage
        catalog.ts                           blank steps, template entries, catalogText (translates)
        step-kinds.ts                        icon and colours of each kind of step
        Segmented.svelte, SearchField.svelte the segmented control and the search box of the panel
        nodes/                               one step view and one start view per node style,
                                             node-appearances.ts (registry), node-geometry.ts
        side-panel/                          palette (nothing inspected) / inspector of the inspected step
          side-panel-width.svelte.ts         the width of the panel per mode, remembered in localStorage
          StepInspector/                     the inspector, step-inspector.state.svelte.ts (the draft
                                             of the step, applied at each edit)
        QuickAddMenu/                        the step picker of a dropped link, quick-add.state.svelte.ts
    dashboard/                               Dashboard, chart, table, pipeline table columns
      DashboardPipeline/                     the page, pipeline-dashboard.state.svelte.ts (its ViewModel)
  utils/
    blueprint-converter.ts                   Graph ↔ PipelineStep[] (pure, TS only, tested)
    node-catalog.ts                          catalog entry type, search, grouping (pure)
    step-summary.ts                          one-line preview and the issue of a step
    create-default-script.ts
    pipeline-script.ts                       the script document, pipelineNameIssue
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `project` | (the mount's own path) | `LIST_PIPELINES_BY_PROJECT` | `DashboardPipelinePage` |
| `project` | `create` | `CREATE_PIPELINE` | `PipelineCreationPage` |
| `project` | `edit/:pipelineId` | `UPDATE_PIPELINE` | `PipelineUpdatePage` |
| `project` | `pipelines/:pipelineId/jobs` | `LIST_JOBS_BY_PIPELINE` | `PipelineJobsRoute` |

**No nav entry** — pipelines are the project index, reached by entering a project.

The jobs **list** route is owned here, not by [`jobs`](../jobs/AGENTS.md): the page needs a
**Run** action, which is a pipeline operation. `PipelineJobsRoute` renders `JobsPage` (imported
from `jobs`'s public API) and supplies that action. The job **details** route
(`pipelines/:pipelineId/jobs/:jobId`) is owned by `jobs` itself — it needs nothing from here —
and this module links to it with `scyllaNavigate.goToJobDetails(...)`, never by importing
the page.

## Rules that bite here

- **Query options come from `pipeline.queries.ts`**, not from individual `use-` hooks, and are 
  exported publicly so other modules invalidate what this one reads. After `run()`, also invalidate 
  `JOBS_QUERY_ROOT` / `JOBS_QUERY_KEY(pipelineId)` from `features/jobs` — a run creates a job.
- **CodeMirror is a legitimate use of `$effect`** in `ui/editor/script-editor.svelte.ts` — it's a system 
  outside Svelte that must be synchronized imperatively. That licence does not extend to the rest 
  of the module, which uses Runes.
- **`blueprint.state.svelte.ts` is the graph ViewModel** — it uses Svelte Runes (`$state`, 
  `$effect`) to keep nodes and edges in sync with the document. The canvas takes it as a prop and 
  binds directly to its reactive state.
- **`pipeline-script.state.svelte.ts` holds `script` + `initialScript` only** — draft editor text 
  and the baseline for the dirty check. It is UI state, not server state. Never put the fetched 
  `PipelineEntity` in it.
- **The blueprint has one side panel, on the right.** It shows `blueprint.inspected`, which only
  a click sets (`blueprint.inspect(id)`): a click on a step, a click on a palette entry, a pick in
  `QuickAddMenu`. A drag, a drop and a box selection never open it (`selectNodesOnDrag={false}`);
  a click on the empty canvas closes it. Nothing inspected: the palette. A step: its inspector.
  The panel derives its mode from `blueprint.inspected`; never store it. The canvas selection is
  xyflow's and is not the panel's state.
- **The pipeline name is edited in the header** (`PipelineNameField`), never in the panel: it is
  the name of the whole document. The start node opens nothing.
- **The side panel is a `ResizablePanel`** (`@scylla/ui`). The palette and the inspector each
  keep their own width (`side-panel-width.svelte.ts`).
- **A rebuild from the document keeps the canvas state.** When the document changes from outside
  (the script tab), the graph is built again: a node that is still there keeps its position and
  its selection, and only a new one is laid out. The document must also read back what it
  writes (`stepsOf(withSteps(steps))` equals `steps`, with an empty `workingDir` read as none):
  else each edit is taken for an outside change.
- **A step id follows the server's rule** (`NodeIdRule` in scylla-domain, `NodeId` in the
  protos): trimmed, 1 to 128 of `a-z`, `0-9`, `-`, `_`. `nodeIdIssue` (`utils/step-summary.ts`)
  is that rule; keep both the same. A refused id is shown on the node, in the inspector while it
  is typed (with `toNodeId`, the nearest valid id, as a suggestion), and stops the save before
  the server is called (`invalidStepIds`). It is applied like any edit, never held back.
- **A detached step is shown, not fixed.** A step with no edge into it is linked to the start
  node on save (it has no `deps`). `blueprint.isDetached(id)` puts a warning on the node and in
  the inspector; the canvas does not add the edge itself.
- **The inspector applies each edit at once** (`blueprint.updateStep`), also when the step
  cannot run yet: the inspector, the node and the document always show the same step, and
  `stepIssue` (no command, empty script) is shown on the node and in the inspector. Never hold
  an edit back: a held edit is lost when the panel closes. A rename is applied on blur or Enter
  (`inspector.rename()` → `renameStep`), never per keystroke: the panel is keyed by the step id
  and rebuilds on a rename. The inspector keeps the id that `renameStep` returns, so a refused
  id does not stay typed.
- **A link dropped on empty canvas opens `QuickAddMenu`** (`onconnectend`, `link: { after }`);
  the selected edge's `+` opens it too, to insert a step (`link: { replacing }`). Both go
  through `blueprint.addNode(nodeId, definition, placement)`. The menu is a combobox: the focus
  stays in the search, `aria-activedescendant` names the active option, Tab closes the menu.
- **Node styles are a registry.** `NODE_APPEARANCES` (`node-appearance.svelte.ts`) names them,
  `nodes/node-appearances.ts` maps each to a step view (`StepNodeViewProps`), a start view
  (`StartNodeViewProps`), an `anchor`, a label and an icon. A new style is one name, two views
  and one entry: `StepNode` and `StartNode` only dispatch. The nodes read the style from the
  canvas context (`blueprint-canvas.context.ts`), since xyflow gives a node only its own props.
  The label of a node is part of the node element, so that xyflow measures it.
- **Sizes of the nodes live in `nodes/node-geometry.ts`**: the views set their width from it,
  the handles of a minimal node and the `anchor` (`nodePositionAt`: a dropped step lands on its
  icon, not its corner) are computed from it. Do not write these sizes as Tailwind classes.
- **`presentation/utils/` stays pure**: no `t()`, no import from `ui/`. What translates a
  catalog entry (`catalogText`, `BLANK_STEPS`) is in `blueprint/catalog.ts`; the search takes a
  `resolve` function.
- `blueprint-converter.ts` is the single translation between the flow graph and `PipelineStep[]`. 
  Both directions live there; do not inline conversion in a component. It's pure TypeScript with 
  full test coverage.
- Largest module in the codebase — respect the ~150-line component rule. New editor UI goes in 
  `ui/editor/blueprint/`, new list UI in `ui/dashboard/pipeline-table/`.
- **`data-tour` attributes are anchors of the onboarding tour** (`pipelines` with `data-project-id`, `pipeline-editor`, `pipeline-submit`, and on each row
  `pipeline-history` / `pipeline-actions` / `pipeline-run` with `data-pipeline-id`,
  `data-pipeline-name`, `data-last-status`). Keep them on the same
  element when you move markup. See [`features/onboarding`](../onboarding/AGENTS.md#anchors).

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
