# `features/pipeline` — agent guide

Pipelines: their definition, their editor, and the metadata the overviews read.

**Layer** `features/` · **id** `pipeline` · **DI keys** `pipelineRepository`, `stepTemplateRepository`, `savePipeline`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type PipelineEntity
type PipelineMetadata, PipelineStepEntity, PipelineIdentity
PIPELINES_QUERY_KEY, ORGANIZATION_PIPELINES_QUERY_KEY, PIPELINES_QUERY_ROOT
CREATE_PIPELINE_MUTATION_KEY, RUN_PIPELINE_MUTATION_KEY   // onboarding follows these writes
pipelineQueries                // Query options factories
asPipelineFeed                 // a page of metadata → the list, and whether it is partial
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
node and in the inspector (`templateFor`, `presenters/catalog.presenter.ts`).

**`PipelineMetadata` vs `PipelineEntity` is the split that matters**: lists fetch metadata (no
steps), the editor fetches the entity. Do not make a list page call `getById`.

Reach a repository with `getModuleDomain<typeof PipelineModule.domain>('pipeline')`, in
`pipeline.queries.ts` only.

## Layout

```
pipeline.module.ts                           4 routes + DI wiring (private; registry only)
index.ts                                     public API
domain/
  entities/pipeline.entity.ts                PipelineEntity, the root of its steps: newPipeline,
                                             pipelineIssue (can it be saved), repeatedStepIds, and the
                                             graph of the steps: addStep, updateStep, renameStep,
                                             removeStep, moveStep, setDependencies, dependentsOf,
                                             dependencyCandidates, stepDepths, waitsFor, uniqueStepId,
                                             hasRepeats (pure, tested)
  entities/pipeline-step.entity.ts           PipelineStepEntity, StepDefinition: definitionOf, stepIssue,
                                             stepProblem, blankDefinition, withDefinition,
                                             withDependencies, withoutDependency, withRenamedReference
  structs/pipeline.struct.ts                 PipelineIdentity, PipelineMetadata
  structs/step.struct.ts                     Shell, EnvEntry
  structs/step-id.struct.ts                  StepId: the id rule of the server (stepIdIssue, toStepId)
  structs/pipeline-name.struct.ts            PipelineNameIssue, pipelineNameIssue
  structs/step-template.struct.ts            StepTemplate
  use-cases/save-pipeline.use-case.ts        SavePipelineUseCase: the rules of the server, then create or edit
  repository/pipeline.repository.ts
  repository/step-template.repository.ts
infrastructure/
  default-pipeline.repository.ts             PipelineServiceClient → PipelineEntity
  default-step-template.repository.ts        BUILT_IN_STEP_TEMPLATES
  grpc-pipeline.mapper.ts
presentation/
  pipeline.queries.ts                        TanStack Query options factories
  pipeline.query-keys.ts                     Query key factories (exported publicly)
  messages/                                  pipeline, blueprint, scripting, step (.messages.ts)
  presenters/                                domain data → what a view shows (plain TS, tested)
    step-summary.presenter.ts                summarize (what a node shows), stepPreview, envCounts
    step-kind.presenter.ts                   icon and colours of each kind of step
    step-issue.presenter.ts                  the text of what stops a step (stepIdIssueText)
    step-list.presenter.ts                   the rows, stages and links of the step list
    catalog.presenter.ts                     blank steps, template entries, search, groups, templateFor
    blueprint-layout.presenter.ts            the position of each node: one column per stage, positionAfter
    blueprint-geometry.presenter.ts          the sizes, anchors and footprints of the nodes, linkDropPoint
    pipeline-issue.presenter.ts              the text of what stops a save (pipelineIssueText)
    pipeline-feed.presenter.ts               asPipelineFeed
  mappers/                                   a view format ↔ the domain, both ways (plain TS, tested)
    pipeline-document.mapper.ts              the JSON text of the editor ↔ the steps (toDocument writes it)
    blueprint-flow.mapper.ts                 the steps ↔ the nodes and edges of xyflow
    env-row.mapper.ts                        an env entry ↔ a row of the environment form
  ui/                                        Svelte only
    run-pipeline.state.svelte.ts             the Run action, shared by the dashboard and the jobs page
    PipelineJobs.page.svelte                 the jobs page of a pipeline: JobsPage + the Run action
    dashboard/
      DashboardPipeline/                     the page, its header, pipeline-dashboard.state.svelte.ts
      PipelineTable/                         the table, pipeline-table.columns.ts, and the cells only it
                                             renders (PipelineActions, PipelineChart, PipelineLastJob, PipelineStatus)
    editor/
      PipelineCreation.page.svelte, PipelineUpdate.page.svelte, PipelineEditor.svelte
      pipeline-document.state.svelte.ts      the document of both tabs: script text, baseline, dirty
                                             check, and the issue that stops the save
      unsaved-changes.effect.svelte.ts       warnBeforeUnload: the browser's prompt while unsaved
      PipelineEditorHeader/                  the header, with the name field
      controls/                              what the tabs share: Segmented, SearchField, and
                                             code-editor.effect.svelte.ts (CodeMirror ↔ a string)
      step/                                  the fields of one step, for every view that edits a step
        step-draft.state.svelte.ts           createStepDraft: the draft of a step, applied at each edit
        StepIdField, StepKindPicker, StepScriptField, StepCommandFields, StepWorkingDirField,
        StepEnvFields                        one field (or one group of fields) each, on a StepDraft
      scripting/                             the scripting tab: the steps one by one, or the full document
        PipelineScripting/                   the two views as tabs (and its test, its fixture)
        pipeline-scripting.state.svelte.ts   ViewModel: mode, add/remove/rename, deps, moveStep
        step-panes.state.svelte.ts           the open steps: one or two panes, their tabs, the focus
        step-drafts.state.svelte.ts          one StepDraft per step, shared by its panes and its properties
        StepsView/                           the list, the panes, the properties of the focused step
                                             (steps-view.state.svelte.ts: which side panels are open)
        StepList/                            the list (StepList, StepListRow), and the drag of a step
                                             onto its dependency (step-drag.*)
        StepPane/                            the tabs of a pane and the editor of its step
        StepProperties/                      id, kind, folder, dependencies, environment of a step
        DocumentView.svelte                  the JSON text, with Copy all
      blueprint/                             the visual editor, one folder per responsibility
        PipelineBlueprint.svelte             wires the graph, the canvas, the side panel, the drag
        blueprint.state.svelte.ts            graph ViewModel: nodes, edges, inspected step, add/insert/rename
        canvas/                              the canvas and what it draws
          BlueprintCanvas.svelte, CanvasToolbar.svelte, DeletableEdge.svelte, DropSpot.svelte
          blueprint-canvas.context.ts        what the nodes and edges read from the canvas
          node-appearance-preference.state.svelte.ts   the viewer's node style, kept in localStorage
          nodes/                             one step view and one start view per node style,
                                             node-appearances.registry.ts (style → views)
        catalog/                             CatalogIcon, CatalogItem, QuickAddMenu/ (quick-add.state.svelte.ts)
        palette-drag/                        a palette entry dragged to the canvas with the pointer
          palette-drag.state.svelte.ts       entry, pointer, spot, the canvas as a drop target
          palette-drag.attachments.ts        dragToCanvas (a palette row), acceptPaletteDrop (the canvas)
          PaletteDragGhost.svelte            the dragged icon, in place of the pointer
        side-panel/                          palette (nothing inspected) / inspector of the inspected step
          StepInspector/                     the inspector: the fields of step/, in two tabs
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `project` | (the mount's own path) | `LIST_PIPELINES_BY_PROJECT` | `DashboardPipelinePage` |
| `project` | `create` | `CREATE_PIPELINE` | `PipelineCreationPage` |
| `project` | `edit/:pipelineId` | `UPDATE_PIPELINE` | `PipelineUpdatePage` |
| `project` | `pipelines/:pipelineId/jobs` | `LIST_JOBS_BY_PIPELINE` | `PipelineJobsPage` |

**No nav entry** — pipelines are the project index, reached by entering a project.

The jobs **list** route is owned here, not by [`jobs`](../jobs/AGENTS.md): the page needs a
**Run** action, which is a pipeline operation. `PipelineJobsPage` renders `JobsPage` (imported
from `jobs`'s public API) and supplies that action. The job **details** route
(`pipelines/:pipelineId/jobs/:jobId`) is owned by `jobs` itself — it needs nothing from here —
and this module links to it with `scyllaNavigate.goToJobDetails(...)`, never by importing
the page.

## Rules that bite here

- **Query options come from `pipeline.queries.ts`**, and the key factories are exported
  publicly so other modules invalidate what this one reads. After `run()`, also invalidate
  `JOBS_QUERY_KEY(pipelineId)` from `features/jobs` — a run creates a job.
- **The domain says step; the graph and the formats outside say node.** `PipelineEntity.steps`,
  `stepCount`, `StepTemplate.stepId`. The nodes of xyflow, the protos (`nodes`, `nodeCount`) and
  the JSON text of the editor (`nodes`) keep node: the mappers translate. A step is not
  sequential: steps that do not wait for each other run together, in the same stage.
- **CodeMirror is a legitimate use of `$effect`** in `ui/editor/controls/code-editor.effect.svelte.ts` — it's a system 
  outside Svelte that must be synchronized imperatively. That licence does not extend to the rest 
  of the module, which uses Runes.
- **`blueprint.state.svelte.ts` is the graph ViewModel** — it uses Svelte Runes (`$state`, 
  `$effect`) to keep nodes and edges in sync with the document. The canvas takes it as a prop and 
  binds directly to its reactive state.
- **`pipeline-document.state.svelte.ts` holds `script` + `initialScript` only** — draft editor text 
  and the baseline for the dirty check. It is UI state, not server state. Never put the fetched 
  `PipelineEntity` in it.
- **The blueprint has one side panel, on the right.** It shows `blueprint.inspected`, which only
  a click sets (`blueprint.inspect(id)`): a click on a step, a click on a palette entry, a pick in
  `QuickAddMenu`. A drag, a drop and a box selection never open it (`selectNodesOnDrag={false}`);
  a click on the empty canvas closes it. Nothing inspected: the palette. A step: its inspector.
  The panel derives its mode from `blueprint.inspected`; never store it. The canvas selection is
  xyflow's and is not the panel's state.
- **The scripting tab edits the document, never a copy.** `createPipelineScripting` reads
  `doc.steps` and writes `doc.setSteps(...)` with the operations of `domain/entities/pipeline.entity.ts`,
  as the blueprint does. The steps are views of the document, not files. A document that does
  not parse, or that repeats a step id or a dependency (`hasRepeats`), shows the full document
  only: the "By step" tab is disabled and `StepsView` is not rendered, since its lists are keyed by
  id. The text is never rewritten to remove the repeat.
- **Two steps with the same id: shown, marked, never repaired.** `pipelineIssue` refuses them
  (`repeated-ids`), so Save is disabled and the header says why (`doc.issue`). The blueprint draws
  each of them (a repeat gets a node key of its own, `build#2`, its step keeps its id), marks them
  in red (`PipelineFlowNodeData.repeated`), and is read-only (`blueprint.readOnly`): an edit goes through
  the ids, so it would change the wrong step. The user fixes the ids in the Scripting tab.
- **One draft per step** (`step-drafts.state.svelte.ts`). The panes that show a step and its properties
  panel share it, or each would write its own copy and undo the other's edits. A step that the
  document changed from elsewhere (the full document, the blueprint) gets a new draft: its
  signature (`definitionOf`) no longer matches what the draft wrote. Each draft is built in its
  own `$effect.root`: its deriveds must outlive the component that asked for it first, which a
  rename or a new tab mounts again. Because the roots have no component owner, `draftOf` prunes
  the drafts of the steps that left the document, and `PipelineScripting` calls `dispose()` when
  it unmounts.
- **The step list shows stages, not a tree** (`stepRows`, `stepStages`). The dependencies are a
  graph: a tree would put a step under one of its dependencies only. A stage is the blueprint
  column (the longest path); each row writes all its dependencies (`← build, lint`), and the
  step under the pointer, else the open one, shows its links (`stepRelations`): the steps it waits
  for with an `info` bar on the left, the steps that wait for it with a `primary` bar. Only the
  bar changes, not the background: the rows stay readable. The list has no order of its own.
- **A drop in the step list sets dependencies; it does not reorder** (`moveStep`). A step
  dropped on another one waits for that one only; with Alt it is added to the others; dropped on
  the header ("runs first"), it waits for none. Dropped on a step that waits for it, it first
  leaves its place: the steps that waited for it wait for what it waited for, so no loop is
  possible and every step but the dragged one is a target. `moveStep` shows a toast with "Undo"
  when dependencies are removed (the list of them is formatted with `Intl.ListFormat` in the
  active locale): the editor has no history. A drop on a step that left the document during the
  drag changes nothing. The "runs first" zone covers the header and the hint takes the place of
  the footer button: a row that moves at `dragstart` can cancel a native drag.
- **The drag source of a step is its grip, not its row.** Firefox does not start a native drag
  from a mousedown on a `<button>`, and nearly all the row is a button. The grip
  (`GripVerticalIcon`, `aria-hidden`, shown on hover and focus, its width always kept) carries
  `dragStep`; the `<li>` is only a drop target (`acceptStepDrop`). The id travels in the private
  type `application/x-scylla-step`, never `text/plain`: an editor or an input would take the id
  as text. If the grip leaves the list during a drag, no `dragend` comes: its cleanup ends the
  drag.
- **`StepsView` has two `ResizablePaneGroup`s, and the outer one never changes its panes.** The
  outer group holds three panes that are always there: the list, the middle and the properties.
  The open steps are one or two panes in a group of their own inside the middle. paneforge builds a
  layout again from the default sizes when the number of panes of a group changes (it also pairs
  the i-th handle with the i-th and (i+1)-th pane, so a hidden pane between two others cannot be
  faked with a collapsed pane): a second step would reset the sizes of the list and of the
  properties, and open a list the user closed. Only the sizes of the two steps start again, at
  half each. The properties pane stays when no step is focused (collapsed, its handle hidden), for
  the same reason. A handle between two panes; the toggle of the list is at the start of the tab
  bar of the first step pane, the one of the properties at the end of the tab bar of the last step
  pane (`PanelToggle`, passed to `StepPane` / `StepTabs` as `leading` / `trailing` snippets). A side
  panel closes by a drag under its minimum, by its toggle button, or because the view is too
  narrow: the list below 800 px, the properties below 1100 px, measured on the
  `StepsView` root (`createCompactContainer`), not on the viewport. **The ViewModel is the source of
  truth** (`steps-view.state.svelte.ts`): `open` is the user's choice, else the width, and the
  properties are also closed while no step is focused (`hasProperties`), which keeps the choice.
  One effect per panel calls `pane.collapse()` / `pane.expand()` to follow `open`, with the call
  untracked (a tracked call would run again at each drag step and undo a drag that collapses).
  `onCollapse` / `onExpand` write the choice, only when they disagree with `open`: a collapse
  that the width or the lack of a step caused stores nothing. Sizes are percent (`STEPS_VIEW_SIZES`)
  and are not stored: they last for the visit. `defaultSize` of a pane stays constant, else a
  toggle resets the sizes of the group: it is read once, when the ViewModel is created
  (`defaultSize` of a `SidePanel`: the size of the state at that moment, `0` for a panel that is
  closed then, e.g. the properties of a pipeline with no step). The sync effect does nothing while
  paneforge has no layout for the pane (`getSize()` is `undefined`; `collapse()` would throw an
  assertion). A panel that a narrow first measure hides closes without a transition: the group
  has `transition-none` until a frame after the first measure (`animated`, from
  `createCompactContainer`'s `measured`). The DOM ids of the panes are prefixed (`steps-view-*`,
  `blueprint-*`), as paneforge uses them as element ids.
- **Two panes at most** (`step-panes.state.svelte.ts`). A step can be open in both. It takes the ids in
  the order of the list (`stepRows`, run order), so the first step opened is the first of the list.
  The properties panel shows the step of the focused pane. The tabs of a step that leaves the
  document are dropped (derived, no effect); a rename follows in the tabs (`panes.rename`,
  called before the document changes). Each pane mounts one editor per step (`{#key step.id}`),
  so two steps do not share an undo history.
- **The dependency picker offers `dependencyCandidates` only**: the rule of `canConnect` (see
  "No loop of dependencies"), so a pick cannot make a loop.
- **The pipeline name is edited in the header** (`PipelineNameField`), never in the panel: it is
  the name of the whole document. The start node opens nothing.
- **The side panel of the blueprint is a paneforge pane** (`ResizablePane`), right of the
  canvas in one `ResizablePaneGroup` with `autoSaveId="scylla.blueprint.side-panel"`. The pane is
  keyed by the mode (`{#key mode}`) and each mode has its own `SIDE_PANEL_SIZES` (percent), so
  the group saves one width per mode: the layout is keyed by the constraints of the panes. The
  inspector holds code, so it is wider than the palette.
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
  `DropSpot` draws the `footprint` of the current node style (`presenters/blueprint-geometry.presenter.ts`) in the
  front `ViewportPortal`, so it follows the zoom and no node hides it. No move transition: it
  must stay under the pointer.
- **A step id follows the server's rule** (`NodeIdRule` in scylla-domain, `NodeId` in the
  protos): trimmed, 1 to 128 of `a-z`, `0-9`, `-`, `_`. `stepIdIssue` (`domain/structs/step-id.struct.ts`)
  is that rule; keep both the same. A refused id is shown on the node, in the inspector while it
  is typed (with `toStepId`, the nearest valid id, as a suggestion), and stops the save before
  the server is called (`SavePipelineUseCase`). It is applied like any edit, never held back.
- **No loop of dependencies.** `blueprint.canConnect` refuses a link whose source already waits
  for its target (`waitsFor`, `domain/entities/pipeline.entity.ts`). A document typed by hand can
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
- **Node styles are a registry.** `NODE_APPEARANCES` (`canvas/node-appearance-preference.state.svelte.ts`) names them,
  `canvas/nodes/node-appearances.registry.ts` maps each to a step view (`PipelineNodeViewProps`), a start view
  (`StartNodeViewProps`), an `anchor`, a label and an icon. A new style is one name, two views
  and one entry: `PipelineNode` and `StartNode` only dispatch. The nodes read the style from the
  canvas context (`blueprint-canvas.context.ts`), since xyflow gives a node only its own props.
  The label of a node is part of the node element, so that xyflow measures it.
- **Sizes of the nodes live in `presenters/blueprint-geometry.presenter.ts`**: the views set their width from it,
  the handles of a minimal node and the `anchor` (`nodePositionAt`: a dropped step lands on its
  middle, not its corner) are computed from it. Do not write these sizes as Tailwind classes.
- **The rules of a pipeline are in `domain/`**: the id and name rules on their value objects,
  the graph of the steps on the pipeline, the rest of a step on the step. A view never writes
  its own copy of one. What only serves the display (a preview, an icon, a layout, the JSON
  format of the editor) stays in `presentation/`, beside its users.
- **A save goes through `SavePipelineUseCase`** (`pipelineMutations.create` / `update`). It
  refuses a pipeline that breaks a rule of the server, with an `InvalidPipelineError`: nothing is
  sent. `pipeline.queries.ts` turns the issue into a translated message, and the error toast of
  the app shows it. The editor does not check the rules itself.
- `blueprint-flow.mapper.ts` is the single translation between the flow graph and
  `PipelineStepEntity[]`. Both directions live there; do not inline conversion in a component.
  The position of each node comes from `blueprint-layout.presenter.ts`.
- Largest module in the codebase — respect the ~150-line component rule. New editor UI goes in
  the folder of `ui/editor/blueprint/` that has its responsibility (`canvas/`, `catalog/`,
  `palette-drag/`, `side-panel/`), new list UI in `ui/dashboard/PipelineTable/`. A field of a
  step goes in `ui/editor/step/`, a control of the editor in `ui/editor/controls/`.
  The root of `blueprint/` keeps only what the whole blueprint shares.
  Code that is not Svelte never goes in `ui/`: a text in `messages/`, what a view shows in
  `presenters/`, a conversion in `mappers/`.
- **`data-tour` attributes are anchors of the onboarding tour** (`pipelines` with `data-project-id`, `pipeline-editor`, `pipeline-submit`, and on each row
  `pipeline-history` / `pipeline-actions` / `pipeline-run` with `data-pipeline-id`,
  `data-pipeline-name`, `data-last-status`). Keep them on the same
  element when you move markup. See [`features/onboarding`](../onboarding/AGENTS.md#anchors).

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
