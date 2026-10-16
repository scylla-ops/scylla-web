# `@scylla/ui` — agent guide

The design system: the primitives (adapted from shadcn/ui), the generic composites, the rune helpers,
the stores, i18n rendering and the theme tokens. **No business meaning.**

**Package** `packages/ui` · the bottom of the workspace

## Import rules — the hard one

- **`@scylla/ui` MUST NOT import another package of the workspace** (`ui-is-generic`, error).
  It is the bottom of the graph and depends on nobody.
- Everyone may import it, **through its entry points only** (`package-api-only`, error).
- **Test before adding anything here:** could this live in another product, unchanged? If it
  mentions a pipeline, a job, a role or an organization, it is not UI — it belongs to the
  feature, or to the `shared/` folder of its extension.

## Entry points

| Import | What |
|---|---|
| `@scylla/ui` | the composites (`DataTable`, `ScyllaDialog`, `FeatureHeader`, `ScyllaForm`, …) and `LucideIcon` |
| `@scylla/ui/primitives` | the primitives on bits-ui, adapted from shadcn/ui |
| `@scylla/ui/state` | rune helpers: `createSelection`, `createPagination`, `createFeatureSelection`, `createMeasuredHeight`, `createCompactContainer`, `createNow` |
| `@scylla/ui/stores` | `createStore`, `toRune`, `selectionStore`, the theme store |
| `@scylla/ui/i18n` | `t`, `activeLocale`, `setAppLocale`, `registerCatalogs` |
| `@scylla/ui/utils` | `cn`, `toast` |
| `@scylla/ui/structs` | `PaginationParams`, `PaginationInfo`, `PaginatedList` — plain shapes, the only part a `domain/` may import |
| `@scylla/ui/styles.css` | Tailwind, the theme tokens, the `@source` of every package — imported once, by `apps/web` |
| `@scylla/ui/assets/*` | the logos |

## Structure

```
src/
  index.ts                 `@scylla/ui` — re-exports the groups below
  controls/                IconButton, GatedButton
  data-display/            DataTable, Pagination, PaginationSlot, StatusIndicator,
                           CopyableText, TruncatedText
  feedback/                ScyllaDialog, ErrorState, ConfirmOperationAlertDialog, SecretRevealDialog
  forms/                   ScyllaForm, FormDialog, createFormState, FormItem types
  layout/                  FeatureHeader, ContextItem, PageTransition, ResizablePanel,
                           ScyllaLoadingScreen
  motion/                  page transitions, reduced motion
  editor/                  renderCodeMirror (an attachment), the CodeMirror theme
  icon.ts                  LucideIcon (the prop type of an icon)
  primitives/              the primitives on bits-ui, one folder per primitive
  state/  stores/  i18n/  utils/  structs/     the entry points above
  assets/  styles.css
  locales/                 the catalog of these components
```

## i18n: `registerCatalogs`

`@scylla/ui/i18n` holds the Lingui runtime of the app. The core registers its own catalog and
the catalogs of each extension (`@Extension({ catalogs })`) before `initializeAppLocale`. The
catalogs of this package register themselves.

## Reuse these — do not reinvent

| Need | Use |
|---|---|
| Row selection | `createSelection(key)` over the single `selectionStore` — **no per-feature selection store** |
| Selection for a list header | `createFeatureSelection(key, () => ids, { deleteItem })` → `headerProps` for `FeatureHeader` |
| List header (count, clear, delete, new) | `FeatureHeader` |
| A form | `FormItem[]` → `ScyllaForm`; `FormDialog` wraps it; `createFormState(() => items)` owns values/validation. Declare the ids in the item type (`readonly FormItem<'name' \| 'description'>[]`) and `onSubmit` receives a typed `FormValues` record — never re-index the values by hand |
| Pagination | `createPagination(options)` — local page merged with server `totalCount`/`totalPages`; `responsive: true` sizes the page to the container |
| How much room the layout left a component | `createMeasuredHeight()` → `{ height, measure }`, and `{@attach measure}` on a container sized by the layout, never by its content |
| A table | `DataTable` (+ `createPagination`) — row keys are business ids, never indices. Give each column `meta.card` (see "`DataTable` on a phone") |
| An action the user may not use | `GatedButton` with `allowed={can(…)}` |
| A modal | `ScyllaDialog` (`open`, `onOpenChange`, `title`, `dismissible`). Never `Dialog` + `DialogContent` directly: `ScyllaDialog` rebuilds its content at each opening without recreating `DialogContent`, which is what keeps it closable |
| Confirm a destructive action | `ConfirmOperationAlertDialog`; give it a `continueLabel` that says what the action does ("Deactivate"), else it says "Continue" |
| Show a one-time secret | `SecretRevealDialog` |
| Error state | `ErrorState` |
| Class names | `cn()` |
| Toasts | `toast` from `@scylla/ui/utils` (`svelte-sonner`) |
| Light/dark | `getTheme` / `setTheme` / `currentTheme()` (reactive) from `@scylla/ui/stores` |
| A store | `createStore` from `@scylla/ui/stores`; rune code reads it with `toRune(store)` |
| Translating | `t()` from `@scylla/ui/i18n`, over a `*.messages.ts` |
| A page transition | `PageTransition` — the core's router already wraps every page in it |
| A side panel the user can widen | `ResizablePanel` (`bind:width`, `min`, `max`, `edge`) — a handle with the window splitter role: drag it, or focus it and use the arrow keys, Home and End |

## Forms: the app checks the values, not the browser

`ScyllaForm` renders `<form novalidate>`: the browser shows no validation tooltip, in no
language. The checks are the app's, with translated messages:

- `required` is implicit: a field that is not `optional` keeps the submit disabled while empty.
- `validate(value, values)` on an item gives the message descriptor of a wrong value, or
  `undefined`. The form shows it under the field (`aria-invalid`, `aria-describedby`) when the
  field loses the focus or when a submit is tried, and does not call `onSubmit` while there is
  one. `values` lets a confirmation compare itself with the new password.
- `errors` (a prop) shows a message from the server under its field, e.g. a wrong current
  password.
- An input item takes `autocomplete` (always set it: `username`, `email`, `current-password`,
  `new-password`, `name`, …), `readonly`, and `description` (a hint under the field).
- `autofocus={false}` on a page with several forms: by default the first field takes the focus.

## Rune helpers: `state/`

There are no hooks. Three rules carry over from the migration and still bite:

- **A list that arrives later is passed as a getter, not an array.** `createFeatureSelection`
  takes `() => string[]` and `createFormState` takes `() => items`. Capturing the value once
  freezes the helper on whatever the first, usually empty, render held.
- **`toRune(store)`** (`stores/to-rune.svelte.ts`) is how rune code reads a store. It is built on
  `createSubscriber`, so the subscription starts only while something is reading and the helpers
  stay testable in plain TypeScript, outside any component.
- **Derive instead of mirroring.** `createPagination` derives its page size from the measured
  height, so there is no effect and no frame where the two disagree. Only "the user picked a
  size" is remembered, because nothing else records it.

DOM measurement is an **attachment**, never an effect: `createMeasuredHeight()` returns
`{ height, measure }` and the caller writes `{@attach measure}`.

`motion/` holds the transitions. `prefersReducedMotion()` is not optional decoration: the
`@media (prefers-reduced-motion: reduce)` block in `styles.css` neutralises CSS animations, but a
Svelte transition writes inline styles from JavaScript and that query never sees it — every
transition here asks and collapses its duration to zero.

### `primitives/` — the primitives

The primitives, on **`bits-ui`**. They are adapted from the React components of shadcn/ui (MIT,
see `primitives/README.md`): the Tailwind class strings were copied, then changed where the design
needed it. They are our code now, not vendored code: no CLI and no upstream update manage them. Import them from `@scylla/ui/primitives`. A primitive is ported when its
first consumer needs it — there is no primitive here without a consumer.

The sidebar (`Sidebar*`, `setSidebar` / `getSidebar`) keeps its open state in a Svelte context
that `SidebarProvider` creates. `sidebar-state.svelte.ts` holds it; the mobile layout uses the
`svelte/reactivity` `MediaQuery`.

What a port has to get right, all of it invisible to the compiler:

- **`tsc` sees only a `.svelte` file's default export.** Anything a `.ts` must import — a `cva`
  config, a variant type — lives in a `.ts` beside it (`button-variants.ts`), never in
  `<script module>`.
- **`asChild` is bits-ui's `child` snippet**, and it rides through `...rest`. The trigger's props
  land *on* the caller's element: `<TooltipTrigger>{#snippet child({ props })}<Button {...props}/>`.
  The merged `data-slot` wins over the Button's own — `data-variant` is what still identifies it.
- **Parts that carry no styling are aliased from bits-ui in `index.ts`**, not wrapped.
  `Dialog`, `DialogTrigger`, `DialogClose`, `DialogPortal`, `AlertDialog`, `AlertDialogTrigger`,
  and `Portal` (renders its children at the end of `<body>`, above everything).
- **`AlertDialogAction` / `AlertDialogCancel` are plain `Button`s**, not bits-ui's own, which close
  the dialog on click. Every confirmation here keeps the dialog open and disabled while its
  mutation runs; the parent owns `open`. Do not "fix" this.
- The alert dialog is a **real** `role="alertdialog"` that ignores an outside click.
- **bits-ui drops ARIA roles Radix set, and the wrapper puts them back.** The tooltip content had
  no `role="tooltip"`; the select trigger had every piece of the combobox pattern —
  `aria-haspopup`, `aria-expanded`, `aria-activedescendant` — but no `role="combobox"`. Nothing
  breaks loudly: `aria-describedby` still carries the tooltip text, the button still opens. Check
  the role when you port a primitive, and add it to *our* wrapper when it is missing.
- **CSS variable names change**: `--radix-*-content-transform-origin` becomes
  `--bits-floating-transform-origin`, and the select's available-height/anchor-width variables
  likewise. Nothing fails loudly if you miss one.
- **A centered modal does not slide.** Tailwind 4 centers it with the CSS `translate` property.
  tw-animate-css moves it with `transform`. The browser applies the two, thus the shadcn classes
  `slide-in-from-left-1/2` and `slide-in-from-top-[48%]` move the modal in from the left. Use
  `CENTERED_DIALOG_CLASS` (`dialog/dialog-variants.ts`): fade and zoom only.
  `dialog/centered-dialog.test.ts` fails when a source file has a centering translate and a slide.
- **Radix's `Indicator` parts become an `{#if}` in a children snippet** (checkbox, select item),
  because bits-ui hands the state to the snippet instead of mounting a separate node.
- **Highlight styles need `data-highlighted:`, not just `focus:`.** bits-ui never moves DOM focus
  into a listbox; it tracks the active option with `aria-activedescendant`.
- Composed primitives are driven from a `*.fixture.svelte`: their parts are components, so a
  `createRawSnippet` cannot build them.

Three things about testing them, all in the shared harness so nobody re-derives them:

- **`setup.ts` clears `document.body.style.pointerEvents` before every test.** bits-ui locks the
  page behind an open dialog and the lock outlives unmounting, which made the *next* test in the
  file fail with an error pointing at an innocent line.
- **`setup.ts` stubs `Element.prototype.animate`.** jsdom has no Web Animations API, and a Svelte
  `transition:` runs on it. The stub stays *running* rather than resolving, so a leaving node is
  still observable.
- **`findFloating(role, name?)` / `findTooltip()` from `render.svelte.ts`** for anything in a
  floating layer — tooltip content, select options. floating-ui has no layout to measure in jsdom,
  so it leaves the wrapper at `visibility: hidden` forever: `getByRole` skips the subtree, *and*
  the accessible-name algorithm ignores its text, which is why the helper matches `name` against
  the element's text. Do not fall back to `getByText` — that would keep passing if the element
  lost its role, which is exactly the regression above.

An open-outside click is still out of `userEvent`'s reach; use `fireEvent.pointerDown(document.body)`,
which is what the dismiss layer listens for.

In `vite.config.ts`, `vendor-ui` holds bits-ui and everything it pulls (`@floating-ui`,
`tabbable`, `runed`, `svelte-toolbelt`), lucide and `svelte-sonner`. `clsx` goes in
`vendor-svelte`, because the Svelte runtime imports it too: in `vendor-ui` it made a circular
chunk.

## `DataTable` on a phone

Below `CARD_LAYOUT_WIDTH_PX` (640 px) of its **own** width, `DataTable` renders one card per row
instead of a table. It measures its box, not the viewport: the sidebar takes part of the screen.
The same cell snippets render in both layouts. Each column says where it goes in the card with
`meta.card`:

| `meta.card` | Place in the card |
|---|---|
| `title` | the top line. Several title columns sit side by side; the last one takes the free width |
| `actions` | the right end of the top line |
| `body` | full width, under the top line |
| `meta` (default) | the bottom line, after the column header as a label |
| `hidden` | not shown |

- **A click on a card is a click on the row** (`onRowClick`): on a phone a tap selects, like a
  click on the web. A selected card has `data-state="selected"`.
- **A cell that must render differently in a card** reads `getDataTableLayout().isCard` while it
  initialises (a Svelte context). `PipelineActions` and `TriggerActions` use it to show a menu.
- Body and meta cells are aligned left in a card, even when the cell centres itself for the
  table (`*:justify-start`).

`FeatureHeader` has its own phone layout, from the viewport (`max-width: 639px`): "New" is an
icon (`newIcon`, `Plus` by default) with its label for screen readers only, and when something is
selected, "Select all", "Clear" and Delete go into a bar fixed at the bottom of the screen
(`data-part="feature-header-selection-bar"`). Without a selection there is no bar.

## Rules that bite here

- **A denied `GatedButton` is `aria-disabled`, not `disabled`.** A `disabled` button cannot
  take the focus. Then a keyboard or screen reader user cannot get the reason, and a dialog
  cannot give the focus back to the button. The denied button stays focusable,
  `aria-describedby` points to the reason, and the tooltip opens on hover and on focus. A
  click, Enter or Space does nothing, and it is `type="button"`, thus it submits no form. It is
  the same element when `allowed` changes. In a test, check `aria-disabled="true"`:
  `toBeDisabled()` reads only the `disabled` attribute.
- **An element that scrolls is `relative`.** This applies to each class string with
  `overflow-auto`, `overflow-x-auto`, `overflow-y-auto` or a `*-scroll` value. An `absolute`
  element (an `sr-only` text, a hidden input of bits-ui, a badge) gets its position from the
  nearest positioned ancestor. If the scroller is not positioned, this ancestor is outside the
  scroller, for example the `main` of `PageTransition`. Then the scroller does not clip the
  element, and the element does not move when the scroller scrolls. The element stays at its
  position in the full list, below the visible part. Thus it makes the scroll area of the page
  larger, and the page shows an empty zone below its end. Put `relative` in the same class
  string as the `overflow-*` class. `layout/__test__/scroll-container.test.ts` fails when a
  class string has a scroll class and no `relative`, `absolute`, `fixed` or `sticky`. An
  element that gets its position from a different class string goes in `POSITIONED_ELSEWHERE`
  of that test, with the reason. `dialog-content.svelte` is the only one: it is `fixed` through
  `CENTERED_DIALOG_CLASS`. Do not add `relative` to it: `cn()` keeps the last position class,
  thus `relative` replaces `fixed`.
- **Between a `sticky` element and its scroller, use `overflow-clip`, not `overflow-hidden`.**
  `overflow-hidden` makes a scroll container. The `sticky` element then sticks in that box,
  which does not scroll, and it moves away with the content. `overflow-clip` clips the same
  way, also on the rounded corners, but it does not make a scroll container. The table of
  pipelines of the dashboard uses it.
- **A scroller gives room to the focus ring of its content.** A scroller clips all that is
  outside its padding box: also the focus ring (`ring-[3px]` is a `box-shadow` outside the
  border) and the outline of a focused control. `overflow-y-auto` also makes `overflow-x`
  `auto`, thus the scroller clips on the left and on the right too. When a control touches an
  edge of the scroller, add `-m-1 p-1`: the ring gets 4 px and the content does not move. Put
  the `pr-*` for the scroll bar after `p-1` (`-m-1 p-1 pr-2` replaces `pr-1`). For a control
  that fills a box with `overflow-hidden`, use `focus-visible:ring-inset`.
- **`selectionStore` is keyed by feature.** `createSelection('jobs')` and
  `createSelection('users')` are independent. Never add a second selection store.
- It and `contextStore` (scylla-base, `@platform/context`) are the app's **only** two global UI
  stores (`permissionsStore` in `@platform/authz` holds the permissions). Everything else is TanStack
  Query (server state) or local `$state`.
- **Never put server state in a shared store.**
- A component used by ≥ 2 features moves here and gets exported from its group barrel — when
  it passes the test above. A component used by one stays in that feature.
- `primitives/` keeps the shadcn/ui API (part names, `data-slot`, variants), so that a reader
  who knows shadcn knows them. Prefer composing over editing; if you must edit, keep that API.
- Adding to `@scylla/ui` needs a second real usage. One usage stays inline.
- `data-part` marks the inner parts of a composite that code outside may point at:
  `feature-header-new` and `feature-header-selection-bar` (`FeatureHeader`), `code-snippet-copy` (`CodeSnippet`),
  `secret-reveal-secret` / `-next-step` / `-confirm` (`SecretRevealChecklist`). The onboarding
  tour of scylla-base uses only `feature-header-new`. Keep them; do not use `data-slot` for this, a primitive
  sets its own.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`. After moving a component between modules:
`node scripts/restore-translations.mjs`.
