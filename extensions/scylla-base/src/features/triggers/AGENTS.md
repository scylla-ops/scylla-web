# `features/triggers` — agent guide

What starts a pipeline without a human: schedules and webhooks.

**Layer** `features/` · **id** `triggers` · **DI key** `triggersRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type TriggerEntity, TriggerDraft, CreatedTrigger
type TriggerSource, TriggerInput
TriggerKind                           (enum — a value, not a type)
triggerQueries, triggerMutations, TRIGGERS_QUERY_KEY
```

The
factories in `presentation/triggers.queries.ts` resolve the repository through
`getModuleDomain('triggers')` per call, and a component runs them with `createQuery` /
`createMutation` from `@scylla/core-sdk`.

Never add: `triggers.module.ts`, pages, and never a `.svelte` component — a barrel that exports
one cannot be tree-shaken out of whoever imports it for a type.

## Data contract

`TriggersRepository` — `domain/repository/triggers.repository.ts`:

| Method | Returns |
|---|---|
| `listByPipelineId(pipelineId)` | `TriggerEntity[]` |
| `getById(triggerId)` | `TriggerEntity` |
| `create(pipelineId, TriggerDraft)` | `CreatedTrigger` |
| `update(triggerId, TriggerDraft)` | `TriggerEntity` |
| `deleteById(triggerId)` | `void` |
| `setEnabled(triggerId, enabled)` | `TriggerEntity` |
| `fireNow(triggerId)` | `string` — the created job id |

All wrapped in `ScyllaResult`. Reach it from `triggers.queries.ts` only — never from a component.

## The `TriggerSource` union

`domain/entities/trigger.entity.ts` holds the heart of the module:

```typescript
TriggerKind = Cron | Webhook | Unknown
TriggerSource = CronSource | WebhookSource | UnknownSource   // discriminated on `kind`
```

- **Always narrow on `kind`**; never read `.cron` off a bare `TriggerSource`.
- **`Unknown` is deliberate forward-compatibility.** A backend that adds a trigger type must not
  crash this UI. Every `switch` needs an `Unknown` branch rendering a graceful "unsupported
  trigger type" — do not `throw`, do not fall through, do not assume exhaustiveness.
- `TriggerDraft` / `TriggerSourceDraft` are the *write* shapes (what a form produces); the
  entity is the *read* shape. Keep them distinct.

## Layout

```
triggers.module.ts                   route + DI wiring (private; registry only)
index.ts                             public API
domain/
  entities/trigger.entity.ts         TriggerEntity, TriggerDraft, CreatedTrigger, the union above,
                                     TriggerInput
  structs/cron-expression.struct.ts  the 5-field rule of the server: isCronExpressionValid
  repository/triggers.repository.ts
infrastructure/
  default-triggers.repository.ts      TriggerServiceClient → TriggerEntity
  grpc-trigger.mapper.ts
presentation/
  triggers.queries.ts                every read and write, as query/mutation options
  ui/Triggers/Triggers.page.svelte
  ui/TriggerEditor/TriggerEditor.page.svelte   creates or edits a trigger of a pipeline
  messages/triggers.messages.ts      every string — `lingui extract` cannot read `.svelte`
  ui/components/TriggersHeader/, TriggersOverview/, index.ts (local barrel)
  ui/components/trigger-form/        TriggerForm, TriggerFormSection,
                                     CronScheduleBuilder/, TriggerInputsEditor/
    TriggerEditorView/               the body of the editor page
      trigger-editor-view.state.svelte.ts   the trigger to edit (from the list), and the way back
  ui/triggers-table/                 TriggersTable + triggers-table.columns.ts + cells
  mappers/cron.mapper.ts             the cron text ↔ the model of the builder
  mappers/cron-timezone.mapper.ts    the local time ↔ UTC (the server reads UTC)
  mappers/trigger-form.mapper.ts     the form ↔ the draft of a trigger
  mappers/triggers-navigation.mapper.ts   a pipeline and a trigger → the list and editor pages
  presenters/cron.presenter.ts       WEEKDAYS, describeCron
```

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `project` | `pipelines/:pipelineId/triggers` | `MANAGE_TRIGGERS` | `Triggers.page.svelte` |
| `project` | `pipelines/:pipelineId/triggers/new`, `pipelines/:pipelineId/triggers/:triggerId/edit` | `MANAGE_TRIGGERS` | `TriggerEditor.page.svelte` |

`mappers/triggers-navigation.mapper.ts` builds every URL between the list and the editor. Import
it as a namespace: `triggersNavigation.toEdit(pipelineId, triggerId)`.

**No nav entry** — reached from a pipeline. Breadcrumb highlights `pipelineName`.

One permission covers read and write: seeing a webhook's configuration is close enough to
holding it that they are not split.

## Rules that bite here

- **`fireNow` creates a job**, so `triggerMutations.fireNow` invalidates the pipeline's jobs list
  as well as `TRIGGERS_QUERY_KEY` — otherwise the run the user just started appears nowhere. That
  key is **spelled out locally**, not imported from [`features/jobs`](../jobs/AGENTS.md): one
  array is not worth a module edge, and the graph is cheaper kept acyclic. `jobs`' own
  `JOBS_QUERY_KEY` is the authority — if it changes, this must follow.
- **Do not re-invalidate at the call site.** `triggerMutations` already does it in `onSuccess`.
- **`setEnabled` is optimistic**, with a rollback in `onError`: the switch has to move under the
  pointer, and a round trip's worth of "nothing happened" on a toggle reads as a broken control.
  Keep the rollback honest if you touch it.
- **`onCreated?.(await mutateAsync(draft))` is a trap** — optional-call short-circuits, so with no
  callback the argument is never evaluated: nothing is created. `TriggerForm` awaits into a
  binding first, then calls `onSaved(created)`. Do not fold it back.
- **The trigger editor is a page, not a dialog.** The form has a name, a type, a schedule builder
  or a signature header, and a list of inputs: too much for a modal. The edit page reads the
  trigger from the same list query as the triggers page, so it adds no repository call. An id that
  is not in the pipeline shows an error, not the form. `create` and `update` are the same
  mutations as before.
- **The editor page has the layout of the role editor.** It uses the full width of the frame. On
  a wide screen, General and Schedule (or Webhook) are in the left column, and Inputs is in the
  right column. Only the sections scroll; the Cancel and Create bar stays below them, out of the
  scroll area.
- **The webhook secret is shown by the editor page.** After a create that returns a secret, the
  page shows `SecretRevealDialog` and goes back to the list only when it is closed. Leaving
  earlier would lose a secret that cannot be fetched again.
- **Enable/disable ≠ delete.** `setEnabled` is reversible and preserves configuration; deleting
  a webhook trigger invalidates its URL forever. Keep them distinct in the UI.
- Webhook secrets follow the reveal-once rule: shown at creation, never re-fetchable. Never
  store or log one.
- Cron parsing/formatting lives in `mappers/cron.mapper.ts`; `CronScheduleBuilder` is the only place that
  composes an expression. Do not hand-roll cron strings in a component.
- **`CronScheduleBuilder` does not emit on mount**, deliberately: its parent seeds its own state
  from the same string, so a mount-time emit only re-sends what the parent already has. The React
  effect did, on every open.
- **The form is seeded once.** `TriggerForm` reads its `$state` initializers when it mounts, and
  the page mounts it again for another trigger. Do not add an effect that watches `trigger`.
- **New strings go in `messages/triggers.messages.ts`, never inside a `.svelte`.** Extraction does not
  read components, so a message declared there vanishes from the catalogs without failing a gate.
- **A bits-ui select or menu lives in a floating layer**, which floating-ui leaves
  `visibility: hidden` under jsdom: `getByRole('option')` finds nothing. Use `findFloating` from
  `test/render.ts`.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
