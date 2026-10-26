# `features/onboarding` — agent guide

The first-pipeline tour: a card that moves across the app and points at the element the user must
use next (agent → project → pipeline → run → job).

**Layer** `features/` · **id** `onboarding` · **DI key** `onboardingRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
loadOnboardingTour   // loader of OnboardingTour.svelte
```

The shell mounts it in `LaunchOverlays`, **after** the "What's new" dialog. Never show both.
Never add: `onboarding.module.ts`, a component.

## Data contract

`OnboardingRepository` — `domain/repository/onboarding.repository.ts`:

| Method | Returns |
|---|---|
| `getStatus(userId)` | `OnboardingStatus` — `not-started` when nothing is stored |
| `saveStatus(userId, status)` | `void` |

`OnboardingStatus` (`domain/structs/`): `not-started` · `in-progress` (`step` id, optional
`subject`: the project and the pipeline the tour created) · `completed` · `skipped`.

The only implementation today is local: `DefaultOnboardingRepository` reads and writes
`localStorage` (key `onboarding:<userId>`, the id that `features/login` stores). The backend has
no storage for it yet. When it has, and if the local copy must stay, the repository has two
sources: split it into a local and a remote data source then. Presentation does not change.

## Layout

```
onboarding.module.ts                 DI wiring (private; registry only)
index.ts                             public API: the loader
domain/
  structs/onboarding-status.struct.ts    the status and its transitions: currentStepId, advanceTour,
                                         rewindTour, rememberSubject (pure)
  repository/onboarding.repository.ts
infrastructure/
  default-onboarding.repository.ts       reads localStorage (any `Storage` in a test)
  stored-onboarding.mapper.ts            JSON ↔ status, tolerant
presentation/
  onboarding.queries.ts              status query + save mutation (optimistic)
  messages/onboarding.messages.ts    every string (tour-steps.registry.ts uses them)
  presenters/tour.presenter.ts             visibility, step count, offline agent
  presenters/tour-placement.presenter.ts   card placement, dim path, connector path
  ui/OnboardingTour/                 root (loaded by the shell) + its test, and its parts:
    tour-steps.registry.ts                    THE step list: text, anchors, what moves each step on
    tour-tracking.attachments.svelte.ts  trackTourStep (rAF + click listener), blockPage, portalToBody, holdPointer
    onboarding-tour.state.svelte.ts  ViewModel: status, current step, skip, mutation events
    TourSpot.svelte                  one spot step: tracking, spotlight, card(s)
    TourSpotlight.svelte, TourCard.svelte
    WelcomeDialog.svelte, SkipTourDialog.svelte, FinishTourDialog.svelte
```

## How a step moves on

Each spot step in `tour-steps.registry.ts` declares its `targets` (anchors, the card points at the first
one) and its `advance`:

| `advance.on` | Fires when |
|---|---|
| `next` | the user clicks Next |
| `click` | the user clicks inside the anchor (capture listener on `document`) |
| `appear` | the anchor resolves to an element (checked on each frame) |
| `mutation` | a mutation with that key succeeds in the query client's mutation cache |

`nextWhen` shows a disabled Next until its condition is met; the user still clicks Next (the
agent step does not move on by itself when the agent comes online). The step's `waiting` line
shows only while Next is disabled. `fallback` names the step to go back
to when the first target stays absent for `LOST_AFTER_MS` (a dialog the user closed). Without a
fallback, the card waits in a corner and the page stays usable: the tour never blocks.

## Anchors

Anchors are attributes on the real elements, never CSS classes:

- `data-tour="…"` in the features: `agents`, `agent-details`, `agent-status` (+ `data-online`),
  `agent-run`, `agent-secret`, `agent-run-command`, `agent-dialog-actions` (step 2 of the new
  agent dialog), `projects`, `project-card` (+ `data-project-id`), `pipelines` (+ `data-project-id`), `pipeline-editor`, `pipeline-submit`,
  `pipeline-history` / `pipeline-actions` (+ `data-pipeline-id`, `data-pipeline-name`,
  `data-last-status`), `pipeline-run`, `job-details`.
- `data-part="…"` in `@scylla/ui` (generic parts): `feature-header-new`.
- `data-nav-url` on the core's sidebar links, `data-item-id` on `StatusBar` segments, and the
  `data-slot` of the primitives: the sidebar, the inset and the dialogs.

Removing or renaming one of these breaks a step without a type error. `tour-steps.test.ts` pins
the anchors that carry logic.

A saved tour can hold the id of a removed step. `REPLACED_STEPS` in `domain/structs/onboarding-status.struct.ts`
gives the step that took its place (`reveal-secret` to `copy-secret`). When you remove or rename
a step, add its id there.

The mutation keys come from the barrels: `CREATE_AGENT_MUTATION_KEY` (`agents`),
`CREATE_PROJECT_MUTATION_KEY` (`project`),
`CREATE_PIPELINE_MUTATION_KEY` and `RUN_PIPELINE_MUTATION_KEY` (`pipeline`).

## Behaviour on the page

- **Blocking.** On a step with a Next button, the page takes no input: `blockPage` makes every
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
  `agentQueries.byOrganization`: the agent that the tour created (`subject.agentId`, from the
  create-agent mutation) or else any agent. While it is offline the card says so and offers to
  open it; the notice goes away by itself when the agent is back.
- **Hint.** `step.hint` shows only when `when` still holds `afterMs` after the step began, and
  hides again when it stops holding (the wait step: the job is still pending after 5 s).

## Rules that bite here

- The tour never navigates by itself: after "Create Project" it points at the new project's card
  and waits for its page. Every link goes to `SCYLLA_DOCS_URL`.

- The dim is at `z-40`, under the page's dialogs (`z-50`); the blocking layer is at `z-[55]`;
  rings, connectors and cards are at `z-[60]`. A target inside a dialog stays usable, and the
  card stays on top.
- `holdPointer` stops `pointerdown` on the dim and the cards: without it, a click on the card
  closes the dialog the step points at (bits-ui sees a click outside).
- The automatic start needs `CREATE_AGENT` and `CREATE_PROJECT`. A tour in progress keeps
  showing while the permissions reload.
- Every string goes in `onboarding.messages.ts`. `Start`, `Next` and `Finish` carry the
  `onboarding` context to stay apart from the same words elsewhere.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean. New strings: `pnpm extract && pnpm compile`.
