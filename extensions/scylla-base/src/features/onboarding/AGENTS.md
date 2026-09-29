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

The only implementation today is local: `DefaultOnboardingRepository` over
`BrowserOnboardingLocalDataSource` (`localStorage`, key `onboarding:<userId>`, the id that
`features/login` stores). The backend has no storage for it yet. When it has, add a remote data
source and change `onboarding.module.ts`. Presentation does not change.

## Layout

```
onboarding.module.ts                 DI wiring (private; registry only)
index.ts                             public API: the loader
domain/
  structs/onboarding-status.struct.ts
  repository/onboarding.repository.ts
infrastructure/
  data/browser-onboarding-local.data-source.ts           localStorage impl
  repository/data-sources/onboarding-local.data-source.ts interface
  repository/mappers/stored-onboarding.mapper.ts         JSON ↔ status, tolerant
  repository/default-onboarding.repository.ts
presentation/
  onboarding.queries.ts              status query + save mutation (optimistic)
  onboarding.messages.ts             every string (tour-steps.ts uses them)
  tour-steps.ts                      THE step list: text, anchors, what moves each step on
  tour-machine.calculator.ts         pure transitions: advance, rewind, visibility, count
  tour-placement.calculator.ts       card placement, dim path, connector path
  tour-tracking.actions.ts           trackTourStep (rAF + click listener), holdPointer
  onboarding-tour.state.svelte.ts    ViewModel: status, current step, skip, mutation events
  ui/OnboardingTour/                 root (loaded by the shell) + its test
  ui/TourSpot.svelte                 one spot step: tracking, spotlight, card(s)
  ui/TourSpotlight.svelte, TourCard.svelte
  ui/WelcomeDialog.svelte, SkipTourDialog.svelte, FinishTourDialog.svelte
```

## How a step moves on

Each spot step in `tour-steps.ts` declares its `targets` (anchors, the card points at the first
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
  `agent-run`, `projects`, `project-card` (+ `data-project-id`), `pipelines` (+ `data-project-id`), `pipeline-editor`, `pipeline-submit`,
  `pipeline-history` / `pipeline-actions` (+ `data-pipeline-id`, `data-pipeline-name`,
  `data-last-status`), `pipeline-run`, `job-details`.
- `data-part="…"` in `@scylla/ui` (generic parts): `feature-header-new`, `code-snippet-copy`,
  `secret-reveal-secret` (+ `data-state`), `secret-reveal-next-step`, `secret-reveal-confirm`.
- `data-nav-url` on the core's sidebar links, `data-item-id` on `StatusBar` segments, and the
  shadcn `data-slot` of the sidebar, the inset and the dialogs.

Removing or renaming one of these breaks a step without a type error. `tour-steps.test.ts` pins
the anchors that carry logic.

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
