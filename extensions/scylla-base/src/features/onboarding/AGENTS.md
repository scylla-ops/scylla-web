# `features/onboarding` — agent guide

The welcome dialog and the guided tours. The dialog shows 4 key features, then offers the 3 main
tours. A tour is a card that moves across the app and points at the element the user must use
next. Each tour has 6 steps or fewer.

**Layer** `features/` · **id** `onboarding` · **DI key** `onboardingRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
loadOnboardingTour   // loader of OnboardingTour.svelte
```

The shell mounts `OnboardingTour` in `LaunchOverlays`, **after** the "What's new" dialog. Never
show both. The module adds the page `/<workspace>/help/tours` (`HelpPage/Help.page.svelte`): the
tours, the welcome dialog again and the docs. Its link is in the `help` nav section of the shell,
and "Help & tours" in the user menu opens it.
Never add: `onboarding.module.ts`, a component.

## Data contract

`OnboardingRepository` — `domain/repository/onboarding.repository.ts`:

| Method | Returns |
|---|---|
| `getStatus(userId)` | `OnboardingStatus` — `not-started` when nothing is stored |
| `saveStatus(userId, status)` | `void` |

`OnboardingStatus` (`domain/structs/`): `not-started` (the welcome dialog shows) ·
`in-progress` (`tour` id, `step` id) · `finished` (the end dialog of `tour` shows) · `completed`
· `skipped`. Every status but `not-started` can hold `subject` (the agent, the project and the
pipeline that a tour created). Every status can hold `done` (the ids of the finished tours) and
`declined` (the ids of the tours whose page offer the user turned down). All of them carry over
from one tour to the next. A status saved before the tours has no `tour`: the state finds the tour
that holds its step.

The only implementation today is local: `DefaultOnboardingRepository` reads and writes
`localStorage` (key `onboarding:<userId>`, the id that `features/login` stores). The backend has
no storage for it yet. When it has, and if the local copy must stay, the repository has two
sources: split it into a local and a remote data source then. Presentation does not change.

## Layout

```
onboarding.module.ts                 DI wiring (private; registry only)
index.ts                             public API: the loader
domain/
  structs/onboarding-status.struct.ts    the status and its transitions: currentStepId, startTour,
                                         advanceTour, rewindTour, previousStepId, closeTours,
                                         doneTours, rememberSubject (pure)
  repository/onboarding.repository.ts
infrastructure/
  default-onboarding.repository.ts       reads localStorage (any `Storage` in a test)
  stored-onboarding.mapper.ts            JSON ↔ status, tolerant
presentation/
  onboarding.queries.ts              status query + save mutation (optimistic)
  messages/onboarding.messages.ts    every string (tour-steps.registry.ts uses them)
  presenters/tour.presenter.ts             what the overlay shows (tourView), step count, offline agent
  presenters/intro.presenter.ts            the key feature slides, the tours a user can start
  presenters/tour-placement.presenter.ts   card placement, dim path, connector path
  ui/OnboardingTour/                 root (loaded by the shell) + its test, and its parts:
    tour-steps.registry.ts                    THE tours (TOURS) and their steps: text, anchors,
                                              the repeated button, what moves each step on
    tour-tracking.attachments.svelte.ts  trackTourStep (rAF + click listener), readAction, pressable,
                                         blockPage, portalToBody, holdPointer
    onboarding-tour.state.svelte.ts  ViewModel: status, tour, current step, previous, skip,
                                     mutation events; createTourLauncher (used by the help page)
    TourSpot.svelte                  one spot step: tracking, spotlight, card
    TourSpotlight.svelte, TourCard.svelte, TourIcon.svelte
    IntroDialog.svelte, IntroIllustration.svelte, TourChooser.svelte   the welcome dialog
    SkipTourDialog.svelte, FinishTourDialog.svelte
    TourOffer.svelte                 the offer of a tour on the first visit of its page
  ui/HelpPage/Help.page.svelte       the help page: every tour (Start / Restart), the welcome
                                     dialog again, the docs
```

## How a step moves on

Each step in `tour-steps.registry.ts` declares its `targets` (anchors, the card points at the first
one) and its `advance`:

| `advance.on` | Fires when |
|---|---|
| `next` | the user clicks Next |
| `click` | the user clicks inside the anchor (capture listener on `document`) |
| `appear` | the anchor resolves to an element (checked on each frame) |
| `mutation` | a mutation with that key succeeds in the query client's mutation cache |

`action` repeats a button of the page in the bottom-right corner of the card. Give it only to a
step that asks for a click on a real button, never on a card, a row or a run square. The copy
reads the label (`aria-label`, else the text) and the disabled state of the real button on each
frame, and a click on it calls `click()` on the real button, so the step moves on as if the user
clicked the page. `action.label` replaces the label (the agent step says “Agent”).
`action.ready` replaces the title and the body once the real button is enabled. Without an
`action`, the card shows Next (Finish on the last step) when the step moves on with Next.

`nextWhen` shows a disabled Next until its condition is met; the user still clicks Next (the
agent step does not move on by itself when the agent comes online). The step's `waiting` line
shows only while Next is disabled. `fallback` names the step to go back
to when the first target stays absent for `LOST_AFTER_MS` (a dialog the user closed). Without a
fallback, the card waits in a corner and the page stays usable: the tour never blocks.

## Anchors

Anchors are attributes on the real elements, never CSS classes:

- `data-tour="…"` in the features: `agents`, `agent-details`, `agent-status` (+ `data-online`),
  `add-agent-dialog`, `app-join-code`, `agent-open` (the "Open agent" button), `projects`,
  `project-card` (+ `data-project-id`), `pipelines` (+ `data-project-id`), `pipeline-editor`,
  `pipeline-submit`, `pipeline-triggers`, `pipeline-history` / `pipeline-actions` (+ `data-pipeline-id`,
  `data-pipeline-name`, `data-last-status`), `pipeline-run`, `job-details`, `triggers`,
  `trigger-general`, `trigger-when`, `trigger-submit`, `secrets`, `roles-list`, `role-new`,
  `role-details`, `role-permissions`, `role-submit`, `members`, `members-add`. A wrapper with
  `class="contents"` has no box: `measure` takes the union of its children.
- `data-part="…"` in `@scylla/ui` (generic parts): `feature-header-new`.
- `data-nav-url` on the core's sidebar links, `data-nav-group` on its folding groups,
  `data-item-id` on `StatusBar` segments and on `StatusTrail` dots (the history of the pipelines), and the `data-slot` of the primitives: the sidebar, the
  inset and the dialogs.
- The agent steps use the agents page (`/agents`, `data-tour="agents"`) and its "Add an agent"
  dialog. The run-command step points at the whole dialog: the join code goes away when the
  agent connects, and a step that points at it gets lost. The
  "Agents" link is in the group "Machines", which can be folded: the step points at the group
  until the link shows.

Removing or renaming one of these breaks a step without a type error. `tour-steps.test.ts` pins
the anchors that carry logic.

A saved tour can hold the id of a removed step. `REPLACED_STEPS` in `domain/structs/onboarding-status.struct.ts`
gives the step that took its place (`connect-agent` to `agent-page`). When you remove or rename
a step, add its id there.

The mutation keys come from the barrels: `CREATE_APP_MUTATION_KEY` (`apps`),
`CREATE_PROJECT_MUTATION_KEY` (`project`), `CREATE_PIPELINE_MUTATION_KEY` and
`RUN_PIPELINE_MUTATION_KEY` (`pipeline`), `CREATE_TRIGGER_MUTATION_KEY` (`triggers`),
`CREATE_SECRET_MUTATION_KEY` (`secret`), `CREATE_ROLE_MUTATION_KEY` (`roles`).

## Behaviour on the page

- **Go and Previous.** A step that asks for a click in the menu has `go`: the card shows Go,
  which advances the step and opens that page. Previous always shows; it is greyed out on the
  first step and on a lost card. It opens the page of the previous step, or, for a step with no
  `page`, the page that the user was on when they left it (kept for this visit only). `back`
  replaces `page` for Previous (the project pick goes back to the list). After Previous, an
  `appear` step waits until its element is gone once: the page that the user leaves still shows
  it for a moment, and the step must not move on again at once.
- **On top.** The card, the ring and the page offer use `z-[200]`, the blocker `z-[195]` and the
  Skip confirmation `z-[210]`: above every dialog of the app (`z-50`).
- **Page offer.** A tour with `offer` shows a small card in the bottom right corner of its page
  (`offer.path`, without the workspace slug): "First time here?", Start and Not now. It shows
  only when no tour runs and no dialog of the tours shows, and only for a tour that the user may
  start and that is not in `done` or `declined`. Start begins the tour at `offer.step`, with
  the subject that the path gives (the project, the pipeline). Not now adds the tour to
  `declined`: the card does not come back, the help page still starts the tour. `offer.needs`
  holds the card until an element shows (the run tour needs a pipeline). A global Skip does
  not stop the page offers.
- **Blocking.** On a step with a Next button, the page takes no input (except a `form` step,
  whose targets stay usable because the user types in them): `blockPage` makes every
  other child of `<body>` inert (no click, focus or key) and a transparent layer above the
  dialogs stops the pointer. Only the card works, and the element that `nextWhen` waits a click
  on (the copy button). A step that the user finishes with a click keeps its targets usable
  and dims the rest, as before. The tour renders at the end of `<body>` (`portalToBody`).
- **Steady spotlight.** `measure` takes the layout box (`offsetWidth`/`offsetHeight` around the
  box centre), so a hover or press `scale` does not move the ring, the connector or the card.
- **Motion.** Between two steps the spotlight glides from the old box to the new one
  (`MOVE_MS`, ease-out), and keeps the old box up to `HOLD_MS` while the next page loads. The
  card flies in and fades out. Scroll and resize follow at once. `motionDuration` makes all of
  it instant under `prefers-reduced-motion`.
- **Lost.** When the first target stays absent for `LOST_AFTER_MS`, a step with a `fallback`
  goes back to it (a dialog the user closed). Otherwise the card waits in a corner, without dim
  nor blocking and without Next, and says "This step is on another page" with a "Go back to it"
  button that opens `step.page(subject)`. The tour never jumps forward on its own: a step
  skipped by hand would lose what the next ones need (the agent, the project, the pipeline).
- **Agent offline.** `needsAgent` steps (run the pipeline, wait for the job) watch
  `agentQueries.byWorkspace`: the agent that the tour created (`subject.agentId`, from the
  create-agent mutation) or else any agent. While it is offline the card says so and offers to
  open it; the notice goes away by itself when the agent is back.
- **Hint.** `step.hint` shows only when `when` still holds `afterMs` after the step began, and
  hides again when it stops holding (the wait step: the job is still pending after 5 s).

## Rules that bite here

- The tour never navigates by itself: after "Create Project" it points at the new project's card
  and waits for its page. Only a request of the user opens a page: a start from a menu (the
  first step's `page`), Previous (the page of the step before) and "Go back to it". Previous
  closes an open dialog first (Escape). Every link goes to `SCYLLA_DOCS_URL`.

- The dim is at `z-40`, under the page's dialogs (`z-50`); the blocking layer is at `z-[55]`;
  rings, connectors and cards are at `z-[60]`. A target inside a dialog stays usable, and the
  card stays on top.
- `holdPointer` stops `pointerdown` on the dim and the cards: without it, a click on the card
  closes the dialog the step points at (bits-ui sees a click outside).
- A tour shows only if the user holds its `permissions`. The automatic welcome needs
  `CREATE_AGENT` and `CREATE_PROJECT`. A tour in progress keeps
  showing while the permissions reload.
- Every string goes in `onboarding.messages.ts`. `Start`, `Skip`, `Next`, `Previous`, `Finish`,
  `Done`, `Run` and `Agent` carry the `onboarding` context to stay apart from the same words
  elsewhere.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean. New strings: `pnpm extract && pnpm compile`.
