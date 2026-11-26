# `features/project` — agent guide

Projects: the unit that owns pipelines, secrets and its own member list.

**Layer** `features/` · **id** `project` · **DI keys** `projectRepository`, `projectGroupRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

Reads and writes are declared as options objects in `presentation/*.queries.ts`, which a
component or another feature runs with `createQuery`.

## Public API — `index.ts`

```typescript
type ProjectEntity, ProjectList, ProjectLookupEntry, ProjectIcon, ProjectIconChange
projectQueries        byWorkspace (paginated) · lookup (org-wide) · search (the projects page) ·
                      byId (one project, or null) · members
projectLookupQueries  the batched fan-out: { queries, combine } for useQueries/createQueries
projectMutations      create (with an icon: a second UpdateProject; with a group: a MoveProject) ·
                      update (with the icon, and the group) · setIcon · remove
projectIconProps      ProjectIcon → the props of EntityIcon: the sidebar links of the shell use it
projectIconChange     IconChoice of an IconField → ProjectIconChange, for a form of another module
recentColors, keepRecentColor   the user-state key `recent-colors`, for each icon color picker
type ProjectGroupEntity, projectGroupQueries   the groups of a workspace (with their folder color)
type ProjectGroupChoice, groupChoiceOf, groupChoiceComplete   the group of a project form: no
                      group, a group, or a new group with its name and its color
loadGroupField        a loader: the field « Group » of a project form (projects/new/github)
newProjectPath, newProjectGroupIn, withNewProjectGroup   `projects/new?group=<id>`: the group that
                      a new project form chooses first (the "+" of the sidebar, the palette)
projectPins, closedSections   the user-state keys of the pins and of the closed sections, with
                      `onChange`: the sidebar of the shell shows and folds the same sections
PINS, UNGROUPED       the keys of the sections « Pinned » and « No group »
loadProjectTitle      a loader: the icon and the name at the top of the page of a project (pipeline)
canListProjects
PROJECTS_QUERY_KEY, PROJECTS_QUERY_ROOT, PROJECTS_LOOKUP_PAGE
PROJECT_SEARCHES_QUERY_KEY    // the searches of a workspace; `pipeline` refreshes them after a run
CREATE_PROJECT_MUTATION_KEY   // the key of projectMutations.create; onboarding follows it
projectPoints, type ProjectCardContext   // the zones of a project card: see "Widget points"
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
| `search(ProjectSearch)` | `ProjectSearchResult`: the first `limit` projects of a search (text, order, health), the counts of all of them, and `hasMore`. It reads pages of at most 100 |
| `create(name, workspaceId, description?)` | `ProjectEntity` |
| `update(projectId, name?, description?, icon?)` | `ProjectEntity`: one `UpdateProject`. With an icon, the server deletes the old image |
| `setIcon(projectId, icon)` | `ProjectEntity`: `UpdateProject` with the icon only. The server deletes the old image |
| `delete(projectId)` | `void` |

Reach it from `presentation/project.queries.ts` only, never from a component.

`ProjectGroupRepository` — `domain/repository/project-group.repository.ts`, the client of
`ProjectGroupService`:

| Method | Returns |
|---|---|
| `list(workspaceId)` | each `ProjectGroupEntity` of the workspace, in their order. It reads each page |
| `create(workspaceId, name, color?)` | the new group, after the other groups. No color: the default folder |
| `update(groupId, { name?, color? })` | the group. An absent field stays; an empty color goes back to the default folder |
| `reorder(groupId, position)` | the group at its new place, from 0 |
| `delete(groupId)` | `void`. Its projects come after the projects with no group |
| `move({ id, groupId?, beforeId? })` | the project, in the group (or in no group), before `beforeId` or last |

Reach it from `presentation/project-group.queries.ts` only.

## Widget points

`presentation/project.points.ts`, listed in `ProjectModule.points`. Each zone gets a
`ProjectCardContext`: the workspace, the project, its name, `batch`, the projects of the
cards that came with this one, and `density`, the display of the section (`comfortable`,
`compact`, `list` or `tiles`). `cardBody` shows in the comfortable card only. The compact card
and the row show the badge, the subtitle and the footer; the tile shows the badge and the footer,
as its status.

| Point | Where | Filled by |
|---|---|---|
| `project.cardBadge` | after the name of the project | `pipeline`: the count of failing pipelines |
| `project.cardSubtitle` | one line under the name | `integrations`: the linked repository |
| `project.cardBody` | under the description | `pipeline`: the first pipelines, with Run |
| `project.cardFooter` | the bottom line of the card | `pipeline`: the job that runs, or the last job |

This module cannot import `pipeline` or `integrations`: they import it. The zones let them show
on the card with no import back.

## Layout

```
project.module.ts                    route + nav + DI wiring (private; registry only)
index.ts                             public API
domain/
  entities/project.entity.ts         ProjectEntity, ProjectList, CreateProjectInput
  entities/project-group.entity.ts   ProjectGroupEntity, MoveProjectInput, ProjectGroupChoice
  structs/project-search.struct.ts   ProjectSearch, ProjectOrder, ProjectHealth, ProjectCounts,
                                     ProjectSection, ProjectSearchResult, countOfHealth
  structs/project-layout.struct.ts   placeBefore, withPin, withoutPin, MAX_PINS
  repository/project.repository.ts
  repository/project-group.repository.ts
infrastructure/
  default-project.repository.ts      ProjectServiceClient → ProjectEntity; the project cap
  grpc-project.mapper.ts             also the order, the health, the section and the counts
  default-project-group.repository.ts   ProjectGroupServiceClient → ProjectGroupEntity
  grpc-project-group.mapper.ts
presentation/
  project.commands.ts                "Create project...", for the search bar: it opens projects/new
  project.queries.ts                 every read and write, plus the key factories
  project-group.queries.ts           the groups, the moves and « Duplicate »
  project-layout.user-state.ts       the keys `project-pins` and `project-sections`
  project-density.user-state.ts      the key `project-density`: the display of the page and of its
                                     sections, for each workspace
  project.points.ts                  projectPoints: the zones of a project card
  presenters/project-list.presenter.ts   the batches of cards, the orders of the page, the
                                     parameters of the URL
  presenters/project-sections.presenter.ts   the section keys, applyMoves, movesToSave, the
                                     target of a dragged card (cardTargetAt), the texts of a drag;
                                     the order of the groups (groupTargetAt, stepGroup,
                                     groupMovesToSave, groupNews)
  presenters/project-density.presenter.ts    the densities, the choice of a person and its
                                     rules, the grid, the slot, the ghost and the batches of each
  presenters/new-project.presenter.ts   `?group=` of `projects/new` and of its steps
  presenters/folded-preview.presenter.ts   how many chips of a folded section fit before "+N"
  presenters/sortable.presenter.ts   the drag of a grid: the nearest cell, the free cell after the
                                     last one, the scroll at the edges, the style of the lifted item
  ui/Project.page.svelte             picks the workspace, or says there is none
  ui/ProjectList.svelte              keyed on the workspace — that is the page reset
  ui/project-list.state.svelte.ts    createProjectList: the search, the health and the order in
                                     the URL, the search delay, "Show more", the batches
  ui/project-sections.state.svelte.ts   createProjectSections: one search for each section, the
                                     pins, the closed sections, "Show more" for each section
  ui/project-reorder.state.svelte.ts    createProjectReorder: the drops of the reorder mode, the
                                     dragged card, its slot, its settle, its shape in another density
  ui/group-reorder.state.svelte.ts   createGroupReorder: the order of the groups in the reorder
                                     mode, the dragged group, its slot, the keyboard path
  ui/project-density.state.svelte.ts createProjectDensity: the density of the page and of each
                                     section, saved in `project-density`
  ui/reorder.transition.ts           the transitions of the reorder mode, and a card that moves to
                                     another section
  ui/project-layout.context.ts       what the menu of a card reads from the page
  ui/group-focus.attachments.svelte.ts   `?group=<id>`: opens, scrolls to and flashes a group
  ui/ProjectSections/                the sections, their headers (with "+" and « New group »), the
                                     group menu, the group name row, the grid with the drop slot and
                                     the ghost card, the line of chips of a folded section
                                     (FoldedPreview, folded-chips.attachments.ts), the stagger of the
                                     cards and the highlight of a card (section-open.attachments.ts),
                                     the pointer drag of the cards (card-drag.attachments.ts) and of
                                     the groups (group-drag.attachments.ts, GroupGrip), the menu of
                                     each section (SectionMenu: « Display » and the group items),
                                     the move of the items when a density changes
                                     (density-flip.effect.svelte.ts)
  ui/ProjectDensity/                 « Display » of the toolbar (DensityMenu), the radio items of
                                     the densities and their icons
  ui/GroupField/                     the field « Group » of a project form: no group, each group with
                                     its folder, « New group… » with its name and its color
  ui/GroupColor/                     the folder color of a group: the colors (`ColorSwatches` of
                                     `@scylla/ui`, as the icons and the initials), the folder as a
                                     button with its colors in a popover, the field of a form, and
                                     the folder of a header, which saves at the close
  presenters/group-color.presenter.ts   the change that a write sends
  ui/ProjectHeader.svelte            the counts of the workspace, "Select all", "New group",
                                     "New project"
  ui/ProjectToolbar/                 the search field ("/" and Escape), the health filter, the order,
                                     « Display », "Reorder", and the bar of the reorder mode
  ui/ProjectResults/                 the empty states, "Show more"
  ui/ProjectCard/                    the card, its zones, its menu (Pin, Change the icon, Move to
                                     group, Move up and down, Edit, Duplicate, Delete); ProjectItem,
                                     the item of each density with the same zones and menu
  ui/EditProjectDialog/               the dialog of « Edit »; its form: the icon, the name, the
                                     description, saved by one UpdateProject, and the group
  ui/ProjectIcon/                    the one component that draws the icon of a project
  ui/ProjectIconDialog/              the icon picker of @scylla/ui in a dialog; the form saves
  ui/ProjectTitle/                   the icon (a button for an editor) and the name on a project page
  presenters/project-icon.presenter.ts   ProjectIcon ↔ EntityIcon props, IconChoice, ProjectIconChange
  recent-colors.user-state.ts        the key `recent-colors`; project.module.ts imports it
  ui/NewProject/                     the choice of the kind of project: ProjectKindCard per way
  ui/NewRegularProject/              the icon, the name, the description and the group of a
                                     regular project
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
- **The projects page has no page numbers.** It shows 6 cards (3 on a phone), then 12 more at
  each "Show more". The search, the health (`?health=failed|running`) and the order (`?sort=`)
  are in the URL, and the server applies them (`ListProjects`): a new value shows the first
  batch again. The search goes to the URL and the server 250 ms after the last letter.
- **The header counts the whole workspace, the segments count the search.** The health does not
  change the counts of the server, so each segment shows its count with any health.
- **A part of a card reads the data of its whole batch.** The cards that came together have the
  same `batch`: the pipelines of a batch are one `ListPipelineSummaries`, the repositories of the
  workspace are one `ListRepositoryLinks`. Do not read in a zone by `projectId` alone.
- **A link or a button in a card does its own action.** The card opens the project only for a
  click that is not in an `a` or a `button`. Do not stop the propagation of a link: the router
  follows the links on `window`.
- **`data-tour` attributes are anchors of the onboarding tour** (`projects` on the list, `project-card` with
  `data-project-id` on each card, `regular-project` on the card of a regular project,
  `add-project-form` around the form of `projects/new/regular`). Keep them on the same
  element when you move markup. See [`features/onboarding`](../onboarding/AGENTS.md#anchors).
- **A project cap comes from an extension.** `CreateProject` can fail with `RESOURCE_EXHAUSTED`
  and an English server text that names the workspace by id. The repository maps it to
  its own sentence in `create` and keeps the code; the global toast shows it.
- The description is optional in the edit dialog and on the new project page (`optional: true`).
- **Draw the icon of a project with `ProjectIcon` only** (the card, the page, the dialog), and the
  sidebar link with `projectIconProps`. No icon is the folder in `primary`. An image comes from
  `imageUrl(id)` of `@platform/grpc` (`GET /images/{id}`, no token); it falls back to the folder when
  it does not load. A free color goes through `iconColors` of `@scylla/ui`: under 3:1 with the card
  of the theme, the tile is solid. The saved color does not change.
- **Only a person with `UPDATE_PROJECT` on the project changes its icon**: the icon of the page is
  a button for this person only. The server checks it too (`UpdateProject`).
- **Each form that creates or edits a project has the icon** (`IconField` of `@scylla/ui`): « Edit »,
  `projects/new/regular` and `projects/new/github` (integrations). The picker of the dialog
  « Change the icon… » and the icon of the page stay as shortcuts. « Edit » sends the icon in the
  same `UpdateProject` as the name, only at « Save »; « Cancel » forgets it, because the dialog
  builds its form again at each opening. `CreateProject` has no icon: `projectMutations.create`
  sends it in an `UpdateProject` just after, in the same action. When only the icon fails, the
  project stays, one toast says that it is created and one error toast says that its icon is not
  saved. An image goes as bytes at the submit only, so a cancelled form leaves no image on the
  server.
- **The image goes as bytes in `UpdateProject`.** The picker refuses a file over 1 MB or of another
  type than PNG, JPEG or WebP before the upload; the server makes it a square PNG of 256 px.
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

- **`?group=<id>` opens the page on a group** (the search bar of the shell links to it). When the
  sections show, `focusGroup` (`ui/group-focus.attachments.svelte.ts`) opens the group, scrolls to it
  and flashes its header once, then takes the parameter out of the URL. A group that the page does
  not have only clears the parameter. A reduced motion jumps, with no flash.
- **The page has sections when there is no search**: the pins, the groups, then « No group ».
  Each section is one `ListProjects` with `section` (or `project_ids` for the pins) and its own
  "Show more". A search shows one flat list, as before. With no pin and no group, the page shows
  one list with no header.
- **The groups and the order belong to the workspace; the pins belong to the person.** The pins are
  the user-state key `project-pins` (at most 100 for each workspace); the closed sections are
  `project-sections`. In the custom order, the pins keep the order of the person. The sidebar of
  the shell reads the same keys: each write calls the `onChange` listeners, so the page and the
  sidebar fold the same sections and show the same pins at once.
- **A group has a folder color, no glyph.** The same colors as the icon pickers: the colors of the
  theme, the free color with `ColorPicker`, and Reset (the default folder, in grey). `ColorGlyph`
  of `@scylla/ui` draws the folder, with the contrast rules of `EntityIcon`. The « New group » row,
  the rename row and the dialog « New group… » of a card choose it with the name, in one write. A
  click on the folder of a group header opens the colors, for a person who manages the groups: the
  folder shows each change at once, and the color is saved when the colors close. The header, the
  « Move to group » menu of a card and the sidebar of the shell show the color.
- **« Move up » and « Move down » swap a card with its neighbor** (`MoveProject` with
  `before_project_id`), in the order of the page. They show only in the custom order, with no
  search. In the pins, they change the order of the pins.
- **The reorder mode keeps the drops on the page until « Done ».** `applyMoves` gives the page the
  order after the drops; « Done » sends one `MoveProject` for each drop, in their order, and saves the
  pins. The server places a project with the same rule as `placeBefore`, so the order stays the same.
  « Cancel » or Escape forgets the drops. The mode needs the custom order, no search, a screen that
  is not a phone and `UPDATE_PROJECT` on the workspace.
- **The drag uses pointer events, not the native drag.** The real card follows the pointer
  (`position: fixed`); it stays in its grid, so that it keeps its pointer capture. The slot goes to
  the cell nearest to the center of the card, wherever the person took it: the center chooses the
  section first, the pointer only when the center is in none. A finger holds still for 250 ms
  before a drag, so that a quick move scrolls the page. Escape sends the card back. The live region
  of the sections says each place, and « Move up » and « Move down » stay the keyboard way.
- **Each move of the mode has a short transition**, and none with a reduced motion: the other
  cards slide (`reflow` of `@scylla/ui`), the card settles on its slot, a card that changes its
  section slides from its old place, the bar, the slot and the drop zones fade and unfold. The grid
  of a section stays with no card, for these transitions.
- **A section keeps its newest cards while a new read of it loads** (the reorder mode, "Show more",
  « Done »): each read is a new query with no data, so the page shows no skeleton and no old order.
- **Each group has its calls to action for a new project**, for a person with `CREATE_PROJECT` on
  the workspace: the "+" of its header (on a mouse screen it shows on hover and focus), « New
  project here » in the group menu, and a ghost card after the last card. An empty group shows one
  line and « New project ». « No group » has its "+" too; the pins have none. The ghost card and
  the "+" hide in the reorder mode. They open `projects/new?group=<id>`: the page of the kind
  keeps `?group=` for `regular` and `github`, and the form chooses this group first. The sidebar
  of the shell (the "+" of a section) and the palette (« New project in <group> ») open the same
  path. « New group » is in the header of the page, at the end of the page and in the header of
  « No group », for a person who manages the groups.
- **A project form has the field « Group »** (`GroupField`): « Edit », `projects/new/regular` and
  `projects/new/github`. `CreateProject` and `UpdateProject` have no group: the mutation sends a
  `MoveProject` just after, in the same action, and first a `CreateProjectGroup` for « New
  group… ». When only the group fails, the project stays: the success toast shows, and one error
  toast says that the project is not in its group. « New group… » shows only for a person with
  `UPDATE_PROJECT` (the server asks it for `CreateProjectGroup`).
- **A folded section shows one line of chips**, a chip for each first project that fits, then
  "+N". A chip opens the section, scrolls to its card and shows a ring that fades out. "+N" and the
  free part of the line open the section. A closed section thus reads its first cards, as an open
  one. The line measures its chips (`fitChips`): a phone shows fewer chips. The fold and the unfold
  of a section, the chips, the cards that come in (one after the other) and the ring have a
  transition, and none with a reduced motion; the first paint has none.
- **The reorder mode also moves the groups.** In the mode, each group header has a handle (the
  pins and « No group » have none: they stay first and last). A pointer drags the header: each
  section folds, and the slot goes to the group nearest to the center of the header
  (`groupTargetAt`), as for a card. The keyboard: Space on the handle lifts the group, the arrow
  keys move it, Space drops it and Escape gives it back; a live region says each place. « Move
  up » and « Move down » of the group menu change the order of the mode too. « Done » sends one
  `UpdateProjectGroup` with its new `position` for each group that is not at its place
  (`groupMovesToSave`), then the drops of the cards; « Cancel » forgets both. Out of the mode, «
  Move up » and « Move down » of the group menu save at once (a phone has no reorder mode). The
  sidebar of the shell reads the same groups, thus the same order.
- **Each section has a density, and the person chooses it.** « Display » of the toolbar sets the
  density of the page and « Apply to all sections » removes the densities of the sections; the
  menu of each section (also the pins and « No group ») has « Display » for that section; on a
  phone its choices open under it. The choice is the user-state key `project-density` (see
  `platform/user-state/AGENTS.md`), with its tracker entry. A section with the density of the page
  has no entry. A search shows one list in the density of the page. Each density has its grid, its
  skeleton, its slot (`DropSlot`), its ghost item (`GhostItem`) and its batches: a denser section
  loads more items. A card dragged into a section of another density takes the shape of the slot
  there. A change of density moves the items with a slide and a fade (`flipDensity`), and none with
  a reduced motion.
- **The "+" and "…" of a section header are 44 px on a touch screen** (`pointer-coarse:size-11`,
  and on a phone).
- **« Duplicate » copies the name, the description and a glyph icon**, just after the project in its
  group. It does not copy an image icon, the pipelines, the secrets or the members.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
