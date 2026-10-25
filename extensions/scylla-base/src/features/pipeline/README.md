# Pipeline

> [Scylla frontend](../../../../../README.md) › `features/` › **pipeline** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

A pipeline is the definition of what Scylla runs: an ordered graph of steps belonging to a
project. This is the largest module in the frontend, and it covers both halves of the
lifecycle — authoring a pipeline and watching it run.

## What it covers

- **The project's pipeline dashboard** (the project index route) — every pipeline in the
  project, with its last run, its status and a chart. Each run in that chart, and the last-run
  cell, opens that job's details page in [jobs](../jobs/README.md); "View jobs" still opens the
  full, unclipped list.
- **The editor** — creating and updating a pipeline, in two coordinated views.
- **Running** — the Run action, and the jobs page that follows it.
- **Organization-wide reads** — pipeline metadata across every project, for the
  [dashboard](../dashboard/README.md).

## Metadata vs entity

The most important modelling decision here is that a pipeline has two shapes:

- **`PipelineMetadata`** — id, name, project, status. What a *list* needs.
- **`PipelineEntity`** — the whole thing, including its `PipelineStep[]`. What the *editor*
  needs.

The repository exposes them through different methods, and lists never fetch the full entity.
On a project with fifty pipelines that is the difference between fifty step graphs crossing the
wire and none. If you are adding a column to a list, add it to the metadata; reach for
`getById` only when you genuinely need the steps.

## The editor: two views of one definition

`PipelineEditor` presents a pipeline as both a **visual graph** and a **script**, and the two
stay in sync.

The graph is [@xyflow/svelte](https://xyflow.dev): `BlueprintCanvas` with custom nodes
(`StartNode`, `StepNode`) and a custom edge (`DeletableEdge`). `blueprint.state.svelte.ts` is the
ViewModel (Svelte Runes-based) that owns the nodes and edges, keeping them in sync with the
document. `blueprint-converter.ts` is the single place that translates between the graph and the
domain's `PipelineStep[]` — both directions, so the round-trip can't drift. It's written in pure
TypeScript and thoroughly tested.

### One panel instead of dialogs

Editing used to happen in a modal, which hid the graph while you wrote a script. The blueprint
now has a single panel on the right: the **palette**, or the **inspector** of the step you
clicked. You don't add and edit at the same time, so one panel is enough, and the left side
stays free for the app's own sidebar.

While you drag an entry from the palette over the canvas, or pull a link from a step onto empty
canvas, a dashed outline shows the place the new step will take, in the size of your node style
and at the zoom of the canvas. During a palette drag the pointer is hidden and the icon of the
entry takes its place: over the canvas, it is in the middle of the outline, where the middle of
the new node lands.

This drag is the app's, not the browser's drag and drop. The browser draws the pointer of its
own drag (with a "+" or a globe on macOS), cannot change the dragged picture on the way, and
reports the pointer only about every 50 ms. Drawing the drag in the app removes these limits,
and leaves room to make it richer later.

The panel opens on a click only. Moving a node, dropping a step or drawing a selection box
leaves it as it is: an inspector that opens while you arrange the graph gets in the way. Its
state is the clicked step, kept apart from the canvas selection, so a refresh of the graph from
the document does not close it. You can widen the panel; the palette and the inspector each
keep their own width.

The pipeline's name is not a step: it is the title of the document, so it is edited in the
header, next to Save, where it is always visible.

A step with no link into it has no dependency, so saving links it to the start of the
pipeline. The canvas shows a warning on that step instead of drawing the link itself: you see
what will happen, and you can still connect it to the step you meant.

- The palette offers blank steps (bash, sh, command) and **templates**. Click to add, or drag
  onto the canvas to place. Templates come from `StepTemplateRepository`: built in today, served
  by the backend later, without the palette changing.
- Dropping a link on empty canvas opens a small menu to pick the next step right there; the `+`
  of a selected edge inserts a step in it.
- The inspector applies every edit to the draft at once — there is no Save in the panel; the
  header's Save still saves the pipeline. A step that cannot run yet (no command, empty script)
  is applied too, and the inspector and the node both say why: holding the edit back would show
  one step in the panel and another on the canvas, and lose the edit when the panel closes.

### Node styles

The viewer picks how steps look: **detailed** (a card: icon, id, what it runs, folder,
variables) or **simplified** (a flat square with the kind's icon, the id under it). The choice is
a per-browser convenience, kept in `localStorage`. Styles are a registry
(`canvas/nodes/node-appearances.ts`), so a new one is a view of a step, a view of the start node and
one entry — the canvas, the switch and the layout do not change.

### The scripting tab: one step at a time

The script used to be one large JSON text: a shell script was a JSON string, with `\n` and
`\"` in it, and a pipeline of ten steps was hundreds of lines to scroll. The scripting tab now
has two views of the same document:

- **By step** (the default): the list of the steps in the order they run, an editor for the open
  step, and its properties. A script is edited as shell code; a command, which runs with no
  shell, as a form. Two steps can be open side by side, as in an IDE.
  To change what a step waits for, drag it in the list onto that step: the list follows the
  graph, so a drop sets the dependencies instead of a position. Alt keeps the other ones.
  The list and the properties each have a button in the tab bar of the steps to hide them. They
  hide themselves when the view is too narrow for three columns, and a click on the button wins
  over the width for the rest of the visit. A handle between two panels resizes them, also
  between the two open steps; drag a panel under its minimum and it closes.
- **Full document**: the JSON text, as it is saved, to copy a whole pipeline or paste one.

The steps are views, not files: every edit goes back to the one document, as the blueprint does,
and the document stays what is saved. A document that does not parse has no steps to show, so
the tab shows its text until it is fixed.

A step has one draft (`step-drafts.svelte.ts`), shared by the panes that show it and by its
properties: two drafts of one step would each write their own copy and undo the other's edits.
The draft is built again only when the document changes the step from elsewhere.

The script side is CodeMirror 6, mounted with the `renderCodeMirror` attachment of `@scylla/ui`. `pipeline-script.state.svelte.ts` holds `script` and `initialScript`: the draft text
and the baseline for the dirty check. That is UI state hosted in a ViewModel, and it stays there
— the *saved* pipeline stays in TanStack Query.

CodeMirror is the clearest legitimate use of Svelte `$effect` in this module: it's a system
outside the framework that has to be synchronized imperatively. That licence stops at the
editor's edge: the rest of the module derives during render with Runes.

## Owning the jobs route

`/:org/projects/:projectId/pipelines/:pipelineId/jobs` is declared by **this** module, not by
[jobs](../jobs/README.md), even though it shows a jobs table.

The reason is the Run button. Running is a pipeline operation. If `jobs` owned the route it
would need a pipeline mutation, which means importing `pipeline` for a concern that isn't its
own. Instead `PipelineJobsRoute` wraps `JobsPage` — imported from `jobs`'s public API — and
supplies the Run action itself. `JobsPage` is one of only two pages in the codebase exported
from a feature barrel, and this is its single consumer.

## Cache coordination

`PIPELINES_QUERY_KEY`, `ORGANIZATION_PIPELINES_QUERY_KEY` and `PIPELINES_QUERY_ROOT` are part of
the public API so other modules invalidate exactly what this one reads.

Running a pipeline is the interesting case: it creates a *job*, so `useRunPipeline` invalidates
the jobs keys as well as its own. That cross-module invalidation only works because both modules
export their key factories instead of writing arrays inline.

## Routes

| Path | Permission | What |
|---|---|---|
| project index | `LIST_PIPELINES_BY_PROJECT` | the pipeline dashboard |
| `create` | `CREATE_PIPELINE` | new pipeline |
| `edit/:pipelineId` | `UPDATE_PIPELINE` | editor |
| `pipelines/:pipelineId/jobs` | `LIST_JOBS_BY_PIPELINE` | runs, with Run |

No sidebar entry: pipelines *are* the project, reached by entering one.

## Related modules

- [jobs](../jobs/README.md) — what a run produces.
- [triggers](../triggers/README.md) — what starts a run without a human.
- [secret](../secret/README.md) — values injected into a run.
- [project](../project/README.md) — the owning scope.
- [marketplace](../marketplace/README.md) — templates to start from.
