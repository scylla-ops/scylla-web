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
kind's icon. A step that runs exactly the code of a template (the same script, or the same
command and arguments; its env, folder and shell do not count) shows the template's icon on its
node and in the inspector (`templateFor`, `utils/node-catalog.ts`).

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
    editor/                                  PipelineEditor + header (with the name field), the
                                             CodeMirror binding (script-editor.svelte.ts)
      pipeline-script.state.svelte.ts        the editor's document: script text, baseline, dirty check
      controls/                              Segmented.svelte, SearchField.svelte: the editor's controls
      step/                                  the fields of one step, for every view that edits a step
        step-draft.svelte.ts                 createStepDraft: the draft of a step, applied at each edit
        step-kinds.ts                        icon and colours of each kind of step
        step.messages.ts, step-issue-text.ts the strings of the fields and of the issues of a step
        StepIdField, StepKindPicker, StepScriptField, StepCommandFields, StepWorkingDirField,
        StepEnvFields                        one field (or one group of fields) each, on a StepDraft
      scripting/                             the scripting tab: the jobs one by one, or the full document
        PipelineScripting/                   the two views as tabs (and its test, its fixture)
        scripting.state.svelte.ts            ViewModel: mode, add/remove/rename, deps, the panes, the drafts
        job-panes.svelte.ts                  the open jobs: one or two panes, their tabs, the focus
        job-drafts.svelte.ts                 one StepDraft per job, shared by its panes and its properties
        JobsView.svelte                      the list, the panes, the properties of the focused job
        JobList/                             the jobs in the order they run (job-list.calculator.ts)
        JobPane/                             the tabs of a pane and the editor of its job
        JobProperties/                       id, kind, folder, dependencies, environment of a job
        DocumentView.svelte                  the JSON text, with Copy all
        scripting.messages.ts, copy-to-clipboard.ts
      blueprint/                             the visual editor, one folder per responsibility
        PipelineBlueprint.svelte             wires the graph, the canvas, the side panel, the drag
        blueprint.state.svelte.ts            graph ViewModel: nodes, edges, inspected step, add/insert/rename
        blueprint.messages.ts                the strings of the whole blueprint
        canvas/                              the canvas and what it draws
          BlueprintCanvas.svelte, CanvasToolbar.svelte, DeletableEdge.svelte
          blueprint-canvas.context.ts        what the nodes and edges read from the canvas
          node-appearance.svelte.ts          the viewer's node style, remembered in localStorage
          nodes/                             one step view and one start view per node style,
                                             node-appearances.ts (registry), node-geometry.ts
          drop-spot.calculator.ts, DropSpot.svelte   the outline of where a new step lands
        catalog/                             what can be added
          catalog.ts                         blank steps, template entries, catalogText (translates)
          CatalogIcon.svelte, CatalogItem.svelte   the tile and the row of an entry
          QuickAddMenu/                      the step picker of a dropped link, quick-add.state.svelte.ts
        palette-drag/                        a palette entry dragged to the canvas with the pointer
          palette-drag.state.svelte.ts       entry, pointer, spot, the canvas as a drop target
          palette-drag.attachments.ts        dragToCanvas (a palette row), acceptPaletteDrop (the canvas)
          PaletteDragGhost.svelte            the dragged icon, in place of the pointer
        side-panel/                          palette (nothing inspected) / inspector of the inspected step
          side-panel-width.svelte.ts         the width of the panel per mode, remembered in localStorage
          StepInspector/                     the inspector: the fields of step/, in two tabs
    dashboard/                               Dashboard, chart, table, pipeline table columns
      DashboardPipeline/                     the page, pipeline-dashboard.state.svelte.ts (its ViewModel)
  utils/
    blueprint-converter.ts                   Graph ↔ PipelineStep[] (pure, TS only, tested)
    pipeline-steps.ts                        operations on PipelineStep[]: depths, waitsFor, add,
                                             rename, remove, deps (pure, tested)
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
- **The scripting tab edits the document, never a copy.** `createScriptingState` reads
  `doc.steps` and writes `doc.setSteps(...)` with the operations of `utils/pipeline-steps.ts`,
  as the blueprint does. The jobs are views of the document, not files. A document that does
  not parse, or that repeats a job id or a dependency (`hasRepeats`), shows the full document
  only: the "By job" tab is disabled and `JobsView` is not rendered, since its lists are keyed by
  id. The text is never rewritten to remove the repeat.
- **One draft per job** (`job-drafts.svelte.ts`). The panes that show a job and its properties
  panel share it, or each would write its own copy and undo the other's edits. A job that the
  document changed from elsewhere (the full document, the blueprint) gets a new draft: its
  signature (`definitionOf`) no longer matches what the draft wrote. Each draft is built in its
  own `$effect.root`: its deriveds must outlive the component that asked for it first, which a
  rename or a new tab mounts again. Because
  the roots have no component owner, `draftOf` prunes the drafts of the jobs that left the
  document, and `PipelineScripting` calls `dispose()` when it unmounts.
- **Two panes at most** (`job-panes.svelte.ts`). A job can be open in both. The properties panel
  shows the job of the focused pane. The tabs of a job that leaves the document are dropped
  (derived, no effect); a rename follows in the tabs (`panes.rename`, called before the
  document changes). Each pane mounts one editor per job (`{#key step.id}`), so two jobs do
  not share an undo history.
- **The dependency picker offers `dependencyCandidates` only**: the rule of `canConnect` (see
  "No loop of dependencies"), so a pick cannot make a loop.
- **The pipeline name is edited in the header** (`PipelineNameField`), never in the panel: it is
  the name of the whole document. The start node opens nothing.
- **The side panel is a `ResizablePanel`** (`@scylla/ui`). The palette and the inspector each
  keep their own width (`side-panel-width.svelte.ts`).
- **A rebuild from the document keeps the canvas state.** When the document changes from outside
  (the script tab), the graph is built again: a node that is still there keeps its position and
  its selection, and only a new one is laid out. The document must also read back what it
  writes (`stepsOf(withSteps(steps))` equals `steps`, with an empty `workingDir` read as none):
  else each edit is taken for an outside change.
- **A palette entry is dragged with the pointer, not with HTML drag and drop.** The browser
  draws the pointer of an HTML drag (with a "+" or a globe on macOS) and cannot hide it or
  change the dragged picture on the way. `dragToCanvas` (`palette-drag.attachments.ts`)
  captures the pointer of a row: past 4 px a press is a drag, and the click that ends it, or an
  Escape, adds nothing. During a drag `<html>` hides the pointer (`cursor-none`), and
  `PaletteDragGhost` draws the entry's icon (`CatalogIcon`) centred on it, in a `Portal`, at
  each pointer move. `createPaletteDrag` holds the entry, the pointer and the `spot`; the canvas
  registers itself with `acceptPaletteDrop` and gives the position of a drop (`nodePositionAt`:
  the middle of the node lands under the pointer, so the dragged icon is in the middle of the
  outline). A new drag source uses the same state.
- **The canvas outlines where a new step lands**: for a palette drag (`drag.spot`) and for a
  link pulled from an output onto empty canvas (`linkDropPoint`, on xyflow's `useConnection`).
  `DropSpot` draws the `footprint` of the current node style (`canvas/nodes/node-geometry.ts`) in the
  front `ViewportPortal`, so it follows the zoom and no node hides it. No move transition: it
  must stay under the pointer.
- **A step id follows the server's rule** (`NodeIdRule` in scylla-domain, `NodeId` in the
  protos): trimmed, 1 to 128 of `a-z`, `0-9`, `-`, `_`. `nodeIdIssue` (`utils/step-summary.ts`)
  is that rule; keep both the same. A refused id is shown on the node, in the inspector while it
  is typed (with `toNodeId`, the nearest valid id, as a suggestion), and stops the save before
  the server is called (`invalidStepIds`). It is applied like any edit, never held back.
- **No loop of dependencies.** `blueprint.canConnect` refuses a link whose source already waits
  for its target (`waitsFor`, `utils/pipeline-steps.ts`). A document typed by hand can
  still hold a loop: every walk of the dependencies must end on one (`stepDepths` cuts the
  loop where it closes).
- **A detached step is shown, not fixed.** A step with no edge into it is linked to the start
  node on save (it has no `deps`). `blueprint.isDetached(id)` puts a warning on the node and in
  the inspector; the canvas does not add the edge itself.
- **The inspector applies each edit at once** (`blueprint.updateStep`), also when the step
  cannot run yet: the inspector, the node and the document always show the same step, and
  `stepIssue` (no command, empty script) is shown on the node and in the inspector. Never hold
  an edit back: a held edit is lost when the panel closes. A rename is applied on blur or Enter
  (`draft.rename()` → `renameStep`), never per keystroke: the panel is keyed by the step id
  and rebuilds on a rename. The inspector keeps the id that `renameStep` returns, so a refused
  id does not stay typed.
- **A link dropped on empty canvas opens `QuickAddMenu`** (`onconnectend`, `link: { after }`);
  the selected edge's `+` opens it too, to insert a step (`link: { replacing }`). Both go
  through `blueprint.addNode(nodeId, definition, placement)`. The menu is a combobox: the focus
  stays in the search, `aria-activedescendant` names the active option, Tab closes the menu.
- **Node styles are a registry.** `NODE_APPEARANCES` (`canvas/node-appearance.svelte.ts`) names them,
  `canvas/nodes/node-appearances.ts` maps each to a step view (`StepNodeViewProps`), a start view
  (`StartNodeViewProps`), an `anchor`, a label and an icon. A new style is one name, two views
  and one entry: `StepNode` and `StartNode` only dispatch. The nodes read the style from the
  canvas context (`blueprint-canvas.context.ts`), since xyflow gives a node only its own props.
  The label of a node is part of the node element, so that xyflow measures it.
- **Sizes of the nodes live in `canvas/nodes/node-geometry.ts`**: the views set their width from it,
  the handles of a minimal node and the `anchor` (`nodePositionAt`: a dropped step lands on its
  middle, not its corner) are computed from it. Do not write these sizes as Tailwind classes.
- **`presentation/utils/` stays pure**: no `t()`, no import from `ui/`. What translates a
  catalog entry (`catalogText`, `BLANK_STEPS`) is in `blueprint/catalog/catalog.ts`; the search takes a
  `resolve` function.
- `blueprint-converter.ts` is the single translation between the flow graph and `PipelineStep[]`. 
  Both directions live there; do not inline conversion in a component. It's pure TypeScript with 
  full test coverage.
- Largest module in the codebase — respect the ~150-line component rule. New editor UI goes in
  the folder of `ui/editor/blueprint/` that has its responsibility (`canvas/`, `catalog/`,
  `palette-drag/`, `side-panel/`), new list UI in `ui/dashboard/pipeline-table/`. A field of a
  step goes in `ui/editor/step/`, a control of the editor in `ui/editor/controls/`.
  The root of `blueprint/` keeps only what the whole blueprint shares.
- **`data-tour` attributes are anchors of the onboarding tour** (`pipelines` with `data-project-id`, `pipeline-editor`, `pipeline-submit`, and on each row
  `pipeline-history` / `pipeline-actions` / `pipeline-run` with `data-pipeline-id`,
  `data-pipeline-name`, `data-last-status`). Keep them on the same
  element when you move markup. See [`features/onboarding`](../onboarding/AGENTS.md#anchors).

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
