# `@scylla/ui`

> [Scylla frontend](../../README.md) › `packages/ui` ·
> [agent guide](./AGENTS.md) · [architecture](../../docs/architecture.md)

The design system: generic components, state helpers and utilities with **no business meaning**.
Tables, forms, dialogs, pagination, the shadcn-svelte primitives, the theme tokens and the i18n
runtime.

Every package may import `@scylla/ui`. It imports no other package of the workspace, and
dependency-cruiser enforces it. That is what lets an extension written outside this repository
look like the rest of Scylla: it builds with the same parts.

## The test for what belongs here

> Could this live in a completely different product, unchanged?

If the answer is yes, it belongs here. If it mentions a pipeline, a job, a role or an
organization — even in a type name — it belongs to the extension that owns that concept
(for scylla-base: the feature, or [`shared/`](../../extensions/scylla-base/src/shared/README.md)).

The corollary is a rule about *timing*: something moves here at its **second real usage**, not
in anticipation of one. A helper used once stays inline in the feature that uses it.

## Patterns worth knowing before you build

Most screens in Scylla are a list, a header and a form, and the shared layer is why they look
and behave alike:

- **`DataTable`** with **`createPagination()`** — local page state merged with the server's
  `totalCount` and `totalPages`. Row keys are business ids, never array indices.
- **`createSelection(key)`** over a single `selectionStore`. Selection is keyed by feature, so
  `createSelection('jobs')` and `createSelection('users')` are independent — which is why there is
  no per-feature selection store anywhere in the codebase.
- **`FeatureHeader`** — the list header: item count, clear/delete selection, new-item button.
- **`ScyllaForm`** — forms are declared as `FormItem[]` rather than assembled by hand.
  `FormDialog` wraps one in a dialog, `createFormState` owns values, dirty-checking and validation.
  Both are generic over the item ids, so a form declared with literal ids submits a typed
  `FormValues` record (`{ name: string; description: string }`) instead of a bag of pairs the
  caller has to search through.
- **`ScyllaDialog`** for every modal: it closes the same way everywhere and resets its content
  at each opening. **`ConfirmOperationAlertDialog`** for destructive actions, **`SecretRevealDialog`** for values
  shown exactly once.

## Two global stores, and only two

`selectionStore` lives here; `contextStore` lives in
[scylla-base `platform/context`](../../extensions/scylla-base/src/platform/context/README.md). Those are the *only* application-wide stores.

Everything else is either server state — which belongs in TanStack Query, never in a store — or
local component state (`$state`). A store is made with `createStore` (`@scylla/ui/stores`),
and rune code reads it with `toRune`. A feature may add a store for genuinely ephemeral UI state (the pipeline
editor's draft script, the marketplace's filter criteria), but it stays inside that feature and
never holds fetched data.

## Layout

One folder per entry point of `package.json` (`shadcn/`, `state/`, `stores/`, `i18n/`, `utils/`,
`structs/`), and the component groups that `@scylla/ui` re-exports (`data-display`, `feedback`,
`forms`, `controls`, `layout`, `motion`, `editor`). `styles.css` holds Tailwind and the theme
tokens; `apps/web` imports it once. `shadcn/` is ported vendor code — compose around it rather
than editing it.

## Related packages

- [`@scylla/core`](../core/README.md) — the shell, built from these primitives.
- [`scylla-base` `shared/`](../../extensions/scylla-base/src/shared/README.md) — the shared code
  that has a business meaning, and so does not belong here.
