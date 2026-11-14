# `features/pipeline` — agent guide

Pipelines: their definition, their editor, and the metadata the overviews read.

**Layer** `features/` · **id** `pipeline` · **DI keys** `pipelineRepository`, `nodeTemplateRepository`, `savePipeline`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type PipelineEntity
type PipelineMetadata, PipelineNodeEntity, PipelineIdentity
PIPELINES_QUERY_KEY, WORKSPACE_PIPELINES_QUERY_KEY, PIPELINES_QUERY_ROOT
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
| `getMetadataByProjectId(...)` | paginated `PipelineMetadata`, each with its `origin` |
| `getMetadataByWorkspaceId(...)` | paginated `PipelineMetadata`, each with its `origin` |
| `getById(id)` | `PipelineEntity` (full, with nodes) |
| `getWithLayout(id)` | `PipelineWithLayout`: the entity, the places of its nodes and its `origin` |
| `saveLayout(id, layout)` | `void`: the places only, with no new version of the pipeline |
| `create(pipeline, layout?)` | `void` |
| `edit(id, nodes, name?, layout?)` | `PipelineEntity` |
| `deleteById(id)` | `void` |
| `run(id, ref?)` | `PipelineRun`. A `CommitRef` (branch, tag or SHA) of the linked repository; none: an editor pipeline runs with no commit, a file pipeline at the head of the default branch |
| `getFile(id, ref?)` | `PipelineFile`: the file of a file pipeline at the ref (none: the default branch), its nodes, its rules of `on`, its checkout and its errors |
| `exportFile(id, format)` | `PipelineFileExport`: the saved version as a file of the repository, and its path |

`NodeTemplateRepository` — `domain/repository/node-template.repository.ts`:

| Method | Returns |
|---|---|
| `list()` | `NodeTemplateEntity[]` — the ready-made nodes of the editor's palette |

`DefaultNodeTemplateRepository` serves `BUILT_IN_NODE_TEMPLATES` today. When the backend
serves templates, a gRPC implementation replaces it in `pipeline.module.ts`; the palette and
`nodeTemplateQueries.list()` do not change. Its key, `NODE_TEMPLATES_QUERY_KEY`, is a root of
its own: an invalidation of a pipeline key never refetches it. A template's `name` is shown as
is (a tool name such as `npm ci`), and its `icon` is a hint: an unknown hint falls back to the
kind's icon. A node that runs exactly the code of a template (the same script, or the same
command and arguments; its env, folder and shell do not count) shows the template's icon on its
node and in the inspector (`templateFor`, `presenters/catalog.presenter.ts`).

**`PipelineMetadata` vs `PipelineEntity` is the split that matters**: lists fetch metadata (no
nodes), the editor fetches the entity. Do not make a list page call `getById`.

Reach a repository with `getModuleDomain<typeof PipelineModule.domain>('pipeline')`, in
`pipeline.queries.ts` only.

## Layout

```
pipeline.module.ts                           4 routes + DI wiring (private; registry only)
index.ts                                     public API
domain/
  entities/pipeline.entity.ts                PipelineEntity, PipelineIdentity, PipelineMetadata, the
                                             root of its nodes: newPipeline,
                                             pipelineIssue (can it be saved), repeatedNodeIds, and the
                                             graph of the nodes: addNode, updateNode, renameNode,
                                             removeNode, moveNode, setDependencies, dependentsOf,
                                             dependencyCandidates, nodeDepths, waitsFor, uniqueNodeId,
                                             hasRepeats (pure, tested)
  entities/pipeline-node.entity.ts           PipelineNodeEntity, NodeDefinition, Shell, EnvEntry:
                                             definitionOf, nodeRunIssue,
                                             nodeIssue, blankDefinition, withDefinition,
                                             withDependencies, withoutDependency, withRenamedReference
  entities/node-template.entity.ts           NodeTemplateEntity: a ready-made node of the palette
  structs/node-id.struct.ts                  NodeId: the id rule of the server (nodeIdIssue, toNodeId)
  structs/pipeline-name.struct.ts            PipelineNameIssue, pipelineNameIssue
  structs/pipeline-layout.struct.ts          NodePlace, PipelineLayout, the limits of the server, mergeLayouts
  structs/pipeline-file-format.struct.ts     PipelineFileFormat (toml, yaml, json), PIPELINE_FILE_FORMATS
  structs/pipeline-file.struct.ts            PipelineFile, FileError, FileRules, CheckoutSettings,
                                             blockingErrors (a warning keeps a file valid)
  structs/commit-ref.struct.ts               CommitRef (branch, tag, SHA), commitShaIssue (7 to 40 hex)
  use-cases/save-pipeline.use-case.ts        SavePipelineUseCase: the rules of the server, then create or edit
  repository/pipeline.repository.ts
  repository/node-template.repository.ts
infrastructure/
  default-pipeline.repository.ts             PipelineServiceClient → PipelineEntity
  default-node-template.repository.ts        BUILT_IN_NODE_TEMPLATES
  grpc-pipeline.mapper.ts                    also originOf: the source, the file and its state
  grpc-pipeline-file.mapper.ts               PipelineFile ↔ the proto, refToProto
presentation/
  pipeline.commands.ts                       create, jobs and edit, for the search bar
  pipeline.queries.ts                        TanStack Query options factories
  pipeline.query-keys.ts                     Query key factories (exported publicly)
  messages/                                  pipeline, blueprint, scripting, node, export, file, run
                                             (.messages.ts)
  presenters/                                domain data → what a view shows (plain TS, tested)
    node-summary.presenter.ts                summarize (what a node shows), nodePreview, envCounts
    node-kind.presenter.ts                   icon and colours of each kind of node
    node-issue.presenter.ts                  the text of what stops a node (nodeIdIssueText)
    node-list.presenter.ts                   the rows, stages and links of the node list
    catalog.presenter.ts                     blank nodes, template entries, search, groups, templateFor
    blueprint-layout.presenter.ts            the position of each node: one column per stage, positionAfter
    blueprint-geometry.presenter.ts          the sizes, anchors and footprints of the nodes, linkDropPoint
    pipeline-issue.presenter.ts              the text of what stops a save (pipelineIssueText)
    pipeline-feed.presenter.ts               asPipelineFeed
    pipeline-file.presenter.ts               a file pipeline: the rows of `on` and of the checkout,
                                             the place of an error, the note of a row of the list
                                             (originNote), the notice of its page (fileNotice)
    ref-options.presenter.ts                 the rows of a branch or tag picker, and of the Run dialog
    job-filter.presenter.ts                  the rows of the branch filter, the names of the events
  mappers/                                   a view format ↔ the domain, both ways (plain TS, tested)
    pipeline-document.mapper.ts              the JSON text of the editor ↔ the nodes (toDocument writes it)
    blueprint-flow.mapper.ts                 the nodes ↔ the nodes and edges of xyflow; placesOf
    env-row.mapper.ts                        an env entry ↔ a row of the environment form
    commit-ref.mapper.ts                     a CommitRef ↔ the value of a row of a picker
  ui/                                        Svelte only
    run-pipeline.state.svelte.ts             the Run action, shared by the dashboard and the jobs page
    RunPipelineDialog/                       the commit to run, for a project with a linked repository
                                             (run-request.state: dialog or direct run; run-target.state:
                                             the picked ref or the typed SHA)
    PipelineJobs/                            the jobs page of a pipeline: JobsPage + the Run action +
                                             the filters (and its test)
    JobFilters/                              branch, event, author, PR (job-filters.state.svelte.ts)
    file/FilePipeline/                       the page of a file pipeline: the editor page, read only
                                             (file-pipeline.state.svelte.ts, the header with the
                                             branch picker, the notice, the locked panel, the text)
    dashboard/
      DashboardPipeline/                     the page, its header, pipeline-dashboard.state.svelte.ts
      PipelineTable/                         the table, pipeline-table.columns.ts, and the cells only it
                                             renders (PipelineActions, PipelineChart, PipelineLastJob, PipelineStatus)
    editor/
      PipelineCreation.page.svelte, PipelineEditor.svelte
      PipelineUpdate/                        the edit page (and its test)
      pipeline-document.state.svelte.ts      the document of both tabs: script text, baseline, dirty
                                             check, the issue that stops the save; MissingDocument
      unsaved-changes.effect.svelte.ts       warnBeforeUnload: the browser's prompt while unsaved
      PipelineEditorHeader/                  the header, with the name field and Export
      ExportPipelineDialog/                  the export as a file: one tab per format, copy, download
                                             (export-pipeline.state.svelte.ts)
      controls/                              what the tabs share: SearchField and
                                             code-editor.effect.svelte.ts (CodeMirror ↔ a string)
      node/                                  the fields of one node, for every view that edits a node
        node-draft.state.svelte.ts           createNodeDraft: the draft of a node, applied at each edit
        NodeIdField, NodeKindPicker, NodeScriptField, NodeCommandFields, NodeWorkingDirField,
        NodeTimeoutRetriesFields, NodeEnvFields
                                             one field (or one group of fields) each, on a NodeDraft
      scripting/                             the scripting tab: the nodes one by one, or the full document
        PipelineScripting/                   the two views as tabs (and its test, its fixture)
        pipeline-scripting.state.svelte.ts   ViewModel: mode, add/remove/rename, deps, moveNode
        node-panes.state.svelte.ts           the open nodes: one or two panes, their tabs, the focus
        node-drafts.state.svelte.ts          one NodeDraft per node, shared by its panes and its properties
        NodesView/                           the list, the panes, the properties of the focused node
                                             (nodes-view.state.svelte.ts: which side panels are open)
        NodeList/                            the list (NodeList, NodeListRow), and the drag of a node
                                             onto its dependency (node-drag.*)
        NodePane/                            the tabs of a pane and the editor of its node
        NodeProperties/                      id, kind, folder, dependencies, environment of a node
        DocumentView.svelte                  the JSON text, with Copy all
      blueprint/                             the visual editor, one folder per responsibility
        PipelineBlueprint.svelte             wires the graph, the canvas, the side panel, the drag
        blueprint.state.svelte.ts            graph ViewModel: nodes, edges, inspected node, add/insert/rename
        node-places.state.svelte.ts          where the places go: at once for a saved node, with the save for a new one
        canvas/                              the canvas and what it draws
          BlueprintCanvas.svelte, CanvasToolbar.svelte, DeletableEdge.svelte, DropSpot.svelte
          blueprint-canvas.context.ts        what the nodes and edges read from the canvas
          keep-fitted.attachments.ts         keepFitted: fits the view again when the canvas resizes
          CanvasCurtain/                     what covers the blueprint until it is ready: the animated
                                             logo, the slow line, the load error (canvas-curtain.state.svelte.ts)
          node-appearance-preference.state.svelte.ts   the viewer's node style: the local copy of `platform/user-state`
          nodes/                             one node view and one start view per node style,
                                             node-appearances.registry.ts (style → views)
        catalog/                             CatalogIcon, CatalogItem, QuickAddMenu/ (quick-add.state.svelte.ts)
        palette-drag/                        a palette entry dragged to the canvas with the pointer
          palette-drag.state.svelte.ts       entry, pointer, spot, the canvas as a drop target
          palette-drag.attachments.ts        dragToCanvas (a palette row), acceptPaletteDrop (the canvas)
          PaletteDragGhost.svelte            the dragged icon, in place of the pointer
        side-panel/                          palette (nothing inspected) / inspector of the inspected node
          NodeInspector/                     the inspector: the fields of node/, in two tabs
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `project` | (the mount's own path) | `LIST_PIPELINES_BY_PROJECT` | `DashboardPipelinePage` |
| `project` | `create` | `CREATE_PIPELINE` | `PipelineCreationPage` |
| `project` | `edit/:pipelineId` | `UPDATE_PIPELINE` | `PipelineUpdatePage` |
| `project` | `pipelines/:pipelineId` | `READ_PIPELINE` | `FilePipelinePage` |
| `project` | `pipelines/:pipelineId/jobs` | `LIST_JOBS_BY_PIPELINE` | `PipelineJobsPage` |

**No nav entry** — pipelines are the project index, reached by entering a project.

The jobs **list** route is owned here, not by [`jobs`](../jobs/AGENTS.md): the page needs a
**Run** action, which is a pipeline operation. `PipelineJobsPage` renders `JobsPage` (imported
from `jobs`'s public API) and supplies that action. The job **details** route
(`pipelines/:pipelineId/jobs/:jobId`) is owned by `jobs` itself — it needs nothing from here —
and this module links to it with `scyllaNavigate.goToJobDetails(...)`, never by importing
the page.

## Rules that bite here

- **`pipelineQueries.byId` does not refetch on a focus or on a reconnect.** It is the document of
  the editor. A new document replaces the draft (`pipeline-document.state.svelte.ts`), and a new
  version in the repository lets a save overwrite the change of another person. A mount or an
  invalidation still reads it again.
- **The frame of the pipeline list stays on an error.** The height of the table area gives the page
  size, and the page size is in the query key. When an error removes the frame, the height goes,
  the key changes, the error goes, and the frame comes back with the old key. Svelte stops this loop
  with `effect_update_depth_exceeded`, and `RouteEntry` shows that the page failed. Show the error
  inside the measured area. A failed refetch keeps the rows.
- **Query options come from `pipeline.queries.ts`**, and the key factories are exported
  publicly so other modules invalidate what this one reads. After `run()`, also invalidate
  `JOBS_QUERY_KEY(pipelineId)` from `features/jobs` — a run creates a job.
- **One word from the backend to the screen: node.** The protos, the JSON text of the editor,
  the domain (`PipelineNodeEntity`, `PipelineEntity.nodes`, `nodeCount`), the views of the jobs and
  of the dashboard, and the texts of the editor all say node. A node is not sequential: nodes that
  do not wait for each other run together, in the same stage. In the blueprint, the objects of
  xyflow are flow nodes (`FlowNode`, `PipelineFlowNode`, `flowNodes`), and the data of a pipeline
  flow node is its node: `flowNode.data.node`. Do not call a node a step or a job: a job is a run.
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
  a click sets (`blueprint.inspect(id)`): a click on a node, a click on a palette entry, a pick in
  `QuickAddMenu`. A drag, a drop and a box selection never open it (`selectNodesOnDrag={false}`);
  a click on the empty canvas closes it. Nothing inspected: the palette. A node: its inspector.
  The panel derives its mode from `blueprint.inspected`; never store it. The canvas selection is
  xyflow's and is not the panel's state.
- **The scripting tab edits the document, never a copy.** `createPipelineScripting` reads
  `doc.nodes` and writes `doc.setNodes(...)` with the operations of `domain/entities/pipeline.entity.ts`,
  as the blueprint does. The nodes are views of the document, not files. A document that does
  not parse, or that repeats a node id or a dependency (`hasRepeats`), shows the full document
  only: the "By node" tab is disabled and `NodesView` is not rendered, since its lists are keyed by
  id. The text is never rewritten to remove the repeat.
- **Two nodes with the same id: shown, marked, never repaired.** `pipelineIssue` refuses them
  (`repeated-ids`), so Save is disabled and the header says why (`doc.issue`). The blueprint draws
  each of them (a repeat gets a node key of its own, `build#2`, its node keeps its id), marks them
  in red (`PipelineFlowNodeData.repeated`), and is read-only (`blueprint.readOnly`): an edit goes through
  the ids, so it would change the wrong node. The user fixes the ids in the Scripting tab.
- **One draft per node** (`node-drafts.state.svelte.ts`). The panes that show a node and its properties
  panel share it, or each would write its own copy and undo the other's edits. A node that the
  document changed from elsewhere (the full document, the blueprint) gets a new draft: its
  signature (`definitionOf`) no longer matches what the draft wrote. Each draft is built in its
  own `$effect.root`: its deriveds must outlive the component that asked for it first, which a
  rename or a new tab mounts again. Because the roots have no component owner, `draftOf` prunes
  the drafts of the nodes that left the document, and `PipelineScripting` calls `dispose()` when
  it unmounts.
- **The node list shows stages, not a tree** (`nodeRows`, `nodeStages`). The dependencies are a
  graph: a tree would put a node under one of its dependencies only. A stage is the blueprint
  column (the longest path); each row writes all its dependencies (`← build, lint`), and the
  node under the pointer, else the open one, shows its links (`nodeRelations`): the nodes it waits
  for with an `info` bar on the left, the nodes that wait for it with a `primary` bar. Only the
  bar changes, not the background: the rows stay readable. The list has no order of its own.
- **A drop in the node list sets dependencies; it does not reorder** (`moveNode`). A node
  dropped on another one waits for that one only; with Alt it is added to the others; dropped on
  the header ("runs first"), it waits for none. Dropped on a node that waits for it, it first
  leaves its place: the nodes that waited for it wait for what it waited for, so no loop is
  possible and every node but the dragged one is a target. `moveNode` shows a toast with "Undo"
  when dependencies are removed (the list of them is formatted with `Intl.ListFormat` in the
  active locale): the editor has no history. A drop on a node that left the document during the
  drag changes nothing. The "runs first" zone covers the header and the hint takes the place of
  the footer button: a row that moves at `dragstart` can cancel a native drag.
- **The drag source of a node is its grip, not its row.** Firefox does not start a native drag
  from a mousedown on a `<button>`, and nearly all the row is a button. The grip
  (`GripVerticalIcon`, `aria-hidden`, shown on hover and focus, its width always kept) carries
  `dragNode`; the `<li>` is only a drop target (`acceptNodeDrop`). The id travels in the private
  type `application/x-scylla-node`, never `text/plain`: an editor or an input would take the id
  as text. If the grip leaves the list during a drag, no `dragend` comes: its cleanup ends the
  drag.
- **`NodesView` has two `ResizablePaneGroup`s, and the outer one never changes its panes.** The
  outer group holds three panes that are always there: the list, the middle and the properties.
  The open nodes are one or two panes in a group of their own inside the middle. paneforge builds a
  layout again from the default sizes when the number of panes of a group changes (it also pairs
  the i-th handle with the i-th and (i+1)-th pane, so a hidden pane between two others cannot be
  faked with a collapsed pane): a second node would reset the sizes of the list and of the
  properties, and open a list the user closed. Only the sizes of the two nodes start again, at
  half each. The properties pane stays when no node is focused (collapsed, its handle hidden), for
  the same reason. A handle between two panes; the toggle of the list is at the start of the tab
  bar of the first node pane, the one of the properties at the end of the tab bar of the last node
  pane (`PanelToggle`, passed to `NodePane` / `NodeTabs` as `leading` / `trailing` snippets). A side
  panel closes by a drag under its minimum, by its toggle button, or because the view is too
  narrow: the list below 800 px, the properties below 1100 px, measured on the
  `NodesView` root (`createCompactContainer`), not on the viewport. **The ViewModel is the source of
  truth** (`nodes-view.state.svelte.ts`): `open` is the user's choice, else the width, and the
  properties are also closed while no node is focused (`hasProperties`), which keeps the choice.
  One effect per panel calls `pane.collapse()` / `pane.expand()` to follow `open`, with the call
  untracked (a tracked call would run again at each drag node and undo a drag that collapses).
  `onCollapse` / `onExpand` write the choice, only when they disagree with `open`: a collapse
  that the width or the lack of a node caused stores nothing. Sizes are percent (`NODES_VIEW_SIZES`)
  and are not stored: they last for the visit. `defaultSize` of a pane stays constant, else a
  toggle resets the sizes of the group: it is read once, when the ViewModel is created
  (`defaultSize` of a `SidePanel`: the size of the state at that moment, `0` for a panel that is
  closed then, e.g. the properties of a pipeline with no node). The sync effect does nothing while
  paneforge has no layout for the pane (`getSize()` is `undefined`; `collapse()` would throw an
  assertion). A panel that a narrow first measure hides closes without a transition: the group
  has `transition-none` until a frame after the first measure (`animated`, from
  `createCompactContainer`'s `measured`). The DOM ids of the panes are prefixed (`nodes-view-*`,
  `blueprint-*`), as paneforge uses them as element ids.
- **Two panes at most** (`node-panes.state.svelte.ts`). A node can be open in both. It takes the ids in
  the order of the list (`nodeRows`, run order), so the first node opened is the first of the list.
  The properties panel shows the node of the focused pane. The tabs of a node that leaves the
  document are dropped (derived, no effect); a rename follows in the tabs (`panes.rename`,
  called before the document changes). Each pane mounts one editor per node (`{#key node.id}`),
  so two nodes do not share an undo history.
- **The dependency picker offers `dependencyCandidates` only**: the rule of `canConnect` (see
  "No loop of dependencies"), so a pick cannot make a loop.
- **The pipeline name is edited in the header** (`PipelineNameField`), never in the panel: it is
  the name of the whole document. The start node opens nothing.
- **The side panel of the blueprint is a paneforge pane** (`ResizablePane`), right of the
  canvas in one `ResizablePaneGroup` with `autoSaveId="scylla.blueprint.side-panel"`. The pane is
  keyed by the mode (`{#key mode}`) and each mode has its own `SIDE_PANEL_SIZES` (percent), so
  the group saves one width per mode: the layout is keyed by the constraints of the panes. The
  inspector holds code, so it is wider than the palette.
- **The user never sees the first fit.** The edit page shows the editor at once: the header has
  a skeleton in the name field, no status, and Save and the Scripting tab are disabled until the
  pipeline comes (`missing`, `MissingDocument`). `PipelineBlueprint` mounts with the document
  only: a graph built before keeps the places of an empty one. In it, the canvas mounts after the
  first layout of the panes (`onLayoutChange`), and the panes have no transition until the canvas
  is ready, so the first fit is at the final width. The canvas is ready when Svelte Flow is
  initialised and the `fitView` promise resolves (the nodes are measured, the view is fitted).
  Until then, `CanvasCurtain` covers the canvas and the side panel with the look of an empty
  canvas, and the blueprint is `inert`: the user does not see the side panel or the view move.
  The times are in `CURTAIN_TIMES`: nothing for 300 ms, then the logo for 400 ms at least, a
  line after 4 s; the logo fades out in 120 ms, then the curtain in 200 ms. With reduced motion,
  the dots do not move and a line says that the pipeline loads. A failed load shows in the
  curtain, with Try again (`refetch`), never as a page of its own.
- **The view frames the nodes until the user moves it.** `keepFitted` fits again at each resize
  of the canvas while `fitted` is true. A pan or a zoom by the user (`onmove` with an event, or a
  zoom button) sets it to false; the fit button sets it to true. Use `onmove`, not `onmovestart`:
  a click on the pane starts a move with no change of the view.
- **A rebuild from the document keeps the canvas state.** When the document changes from outside
  (the script tab), the graph is built again: a node that is still there keeps its position and
  its selection, and only a new one is laid out. The document must also read back what it
  writes (`nodesOf(withNodes(nodes))` equals `nodes`, with an empty `workingDir` read as none):
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
- **The canvas outlines where a new node lands**: for a palette drag (`drag.spot`) and for a
  link pulled from an output onto empty canvas (`linkDropPoint`, on xyflow's `useConnection`).
  `DropSpot` draws the `footprint` of the current node style (`presenters/blueprint-geometry.presenter.ts`) in the
  front `ViewportPortal`, so it follows the zoom and no node hides it. No move transition: it
  must stay under the pointer.
- **A node id follows the server's rule** (`NodeIdRule` in scylla-domain, `NodeId` in the
  protos): trimmed, 1 to 128 of `a-z`, `0-9`, `-`, `_`. `nodeIdIssue` (`domain/structs/node-id.struct.ts`)
  is that rule; keep both the same. A refused id is shown on the node, in the inspector while it
  is typed (with `toNodeId`, the nearest valid id, as a suggestion), and stops the save before
  the server is called (`SavePipelineUseCase`). It is applied like any edit, never held back.
- **No loop of dependencies.** `blueprint.canConnect` refuses a link whose source already waits
  for its target (`waitsFor`, `domain/entities/pipeline.entity.ts`). A document typed by hand can
  still hold a loop: every walk of the dependencies must end on one (`nodeDepths` cuts the
  loop where it closes).
- **A detached node is shown, not fixed.** A node with no edge into it is linked to the start
  node on save (it has no `deps`). `blueprint.isDetached(id)` puts a warning on the node and in
  the inspector; the canvas does not add the edge itself.
- **The inspector applies each edit at once** (`blueprint.updateNode`), also when the node
  cannot run yet: the inspector, the node and the document always show the same node, and
  `nodeRunIssue` (no command, empty script) is shown on the node and in the inspector. Never hold
  an edit back: a held edit is lost when the panel closes. A rename is applied on blur or Enter
  (`draft.rename()` → `renameNode`), never per keystroke: the panel is keyed by the node id
  and rebuilds on a rename. The inspector keeps the id that `renameNode` returns, so a refused
  id does not stay typed.
- **A link dropped on empty canvas opens `QuickAddMenu`** (`onconnectend`, `link: { after }`);
  the selected edge's `+` opens it too, to insert a node (`link: { replacing }`). Both go
  through `blueprint.addNode(nodeId, definition, placement)`. The menu is a combobox: the focus
  stays in the search, `aria-activedescendant` names the active option, Tab closes the menu.
- **Node styles are a registry.** `NODE_APPEARANCES` (`presentation/node-appearance.user-state.ts`) names them,
  `canvas/nodes/node-appearances.registry.ts` maps each to a node view (`PipelineNodeViewProps`), a start view
  (`StartNodeViewProps`), an `anchor`, a label and an icon. A new style is one name, two views
  and one entry: `PipelineNode` and `StartNode` only dispatch. The nodes read the style from the
  canvas context (`blueprint-canvas.context.ts`), since xyflow gives a node only its own props.
  The label of a node is part of the node element, so that xyflow measures it.
- **Sizes of the nodes live in `presenters/blueprint-geometry.presenter.ts`**: the views set their width from it,
  the handles of a minimal node and the `anchor` (`nodePositionAt`: a dropped node lands on its
  middle, not its corner) are computed from it. Do not write these sizes as Tailwind classes.
- **The rules of a pipeline are in `domain/`**: the id and name rules on their value objects,
  the graph of the nodes on the pipeline, the rest of a node on the node. A view never writes
  its own copy of one. What only serves the display (a preview, an icon, a layout, the JSON
  format of the editor) stays in `presentation/`, beside its users.
- **A save goes through `SavePipelineUseCase`** (`pipelineMutations.create` / `update`). It
  refuses a pipeline that breaks a rule of the server, with an `InvalidPipelineError`: nothing is
  sent. `pipeline.queries.ts` turns the issue into a translated message, and the error toast of
  the app shows it. The editor does not check the rules itself.
- **A node carries `timeoutSeconds` and `retries`.** `timeoutSeconds` is optional: absent means the
  server default, or no time limit. `retries` is 0 to 10, absent means 0. The node draft
  (`node-draft.state.svelte.ts`) checks the ranges (1 to 604800 for the timeout); a value out of
  range is shown as an error in `NodeTimeoutRetriesFields` and is not applied, so the node keeps its
  last value in range. The JSON document writes both keys (`timeoutSeconds: null` and
  `retries: 0` when there is none) and reads them back as none, so `nodesOf(withNodes(nodes))`
  still equals `nodes`. The gRPC mapper also reads 0 retries as none.
- `blueprint-flow.mapper.ts` is the single translation between the flow graph and
  `PipelineNodeEntity[]`. Both directions live there; do not inline conversion in a component.
  The position of a node comes from the saved layout, else from `blueprint-layout.presenter.ts`.
- **The pipeline owns the places of its nodes.** All members see the same canvas, so they are not in
  `platform/user-state`. `byId` reads them with `getWithLayout`.
- **A saved node saves its place 500 ms after the end of a drag**, with no Save button and no toast
  (`meta: { showsOwnError: true }`). A node that the server does not hold (new or renamed) sends its
  place with the next Create or Update, in the same transaction as the node.
- **`saveLayout` uses `setQueryData`, not an invalidation.** A refetch replaces the draft of the
  editor. The places do not change the version of the pipeline.
- **Limits of the server:** 256 places in a request (a longer request is refused whole), 1,000,000
  at most on each axis, whole numbers. `withinLimit` and `toNodePlace` apply them. A node with no
  place gets an automatic place. A read-only canvas saves nothing.
- Largest module in the codebase — respect the ~150-line component rule. New editor UI goes in
  the folder of `ui/editor/blueprint/` that has its responsibility (`canvas/`, `catalog/`,
  `palette-drag/`, `side-panel/`), new list UI in `ui/dashboard/PipelineTable/`. A field of a
  node goes in `ui/editor/node/`, a control of the editor in `ui/editor/controls/`.
  The root of `blueprint/` keeps only what the whole blueprint shares.
  Code that is not Svelte never goes in `ui/`: a text in `messages/`, what a view shows in
  `presenters/`, a conversion in `mappers/`.
- **`data-tour` attributes are anchors of the onboarding tour** (`pipelines` with `data-project-id`, `pipeline-editor`, `pipeline-submit`, and on each row
  `pipeline-history` / `pipeline-actions` / `pipeline-run` with `data-pipeline-id`,
  `data-pipeline-name`, `data-last-status`). Keep them on the same
  element when you move markup. See [`features/onboarding`](../onboarding/AGENTS.md#anchors).
- **Export writes the saved version as a file of the repository** (`ExportPipeline`). Only the
  edit page has it (`PipelineEditor` gets `pipelineId`). The button checks `READ_PIPELINE`: the
  route `export_pipeline` is in the same catalog cell as `get_pipeline`. The dialog reads the file
  of the selected format only while it is open (`pipelineQueries.fileExport`). Its key is under
  `PIPELINE_QUERY_KEY`, so a save refreshes it. With unsaved changes, the dialog says that the file
  has the saved version. The path comes from the server: do not build it in the client.

- **A file pipeline is read only, on a page of its own** (`pipelines/:pipelineId`, `READ_PIPELINE`:
  the route `get_file_pipeline` is in the catalog cell of `get_pipeline`). The list opens it
  with View (`goToFilePipeline`), and the edit page of a file pipeline redirects to it. For an
  editor pipeline, this page redirects to the edit page: the crumb of the pipeline on the pages
  under `pipelines/:pipelineId` (jobs, a job, triggers) links here for each source. The page
  is the editor page with no edit: `PipelineBlueprint` gets `locked` (the blueprint is
  `readOnly` and saves no place), a `notice` in place of the notice of the repeated ids, and a
  `sidePanel` in place of the palette (`FilePanel`: the rules of `on` and the checkout, or the
  errors of the file). The Scripting tab shows the text of the file with the colors of its
  format, read only. The branch picker reads the file at another ref
  (`pipelineQueries.file`, keyed under `PIPELINE_QUERY_KEY`). When the file has errors (not
  warnings) or cannot be read (none on the branch: `NOT_FOUND`), the graph shows the saved
  pipeline, faded (`dimmed`): the server keeps the last valid version of the default branch. The
  file query shows its own error (`showsOwnError`). A Schedule or a webhook of Scylla stays in
  the triggers page.
- **The list says the state of a file** under the name of a row (`originNote`): the number of
  errors on the default branch, a file that left the default branch, an archived editor
  pipeline. The default branch comes from the link of the project (`repositoryLinkQueries` of
  `integrations`, which checks `READ_REPOSITORY_LINK`); without it, the text says "the default
  branch".
- **Run asks for a commit only with a linked repository** (`createRunRequest`). Without a link, or
  while the link loads, Run runs at once, as before. The dialog offers the branches and the tags
  (`ListRefs`, the default branch first and chosen) and a row to type a SHA (7 to 40 hex). The
  command bar runs with no ref. The input of `pipelineMutations.run` is `{ pipelineId, ref? }`:
  the guided tour reads `pipelineId` from it (`features/onboarding`).
- **The filters of the jobs show only with a linked repository**: a job with no commit matches
  no filter. A text field (author, PR number) applies its value on change or Enter, not per key.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
