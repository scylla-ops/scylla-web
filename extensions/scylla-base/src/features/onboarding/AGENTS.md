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

`nextWhen` shows a disabled Next until its condition is met. `fallback` names the step to go back
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

The mutation keys come from the barrels: `CREATE_PROJECT_MUTATION_KEY` (`project`),
`CREATE_PIPELINE_MUTATION_KEY` and `RUN_PIPELINE_MUTATION_KEY` (`pipeline`).

## Rules that bite here

- The tour never navigates by itself: after "Create Project" it points at the new project's card
  and waits for its page. Every link goes to `SCYLLA_DOCS_URL`.

- The dim is at `z-40`, under the page's dialogs (`z-50`); rings, connectors and cards are at
  `z-[60]`. A target inside a dialog stays usable, and the card stays on top.
- `holdPointer` stops `pointerdown` on the dim and the cards: without it, a click on the card
  closes the dialog the step points at (bits-ui sees a click outside).
- The automatic start needs `CREATE_AGENT` and `CREATE_PROJECT`. A tour in progress keeps
  showing while the permissions reload.
- Every string goes in `onboarding.messages.ts`. `Start`, `Next` and `Finish` carry the
  `onboarding` context to stay apart from the same words elsewhere.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean. New strings: `pnpm extract && pnpm compile`.
