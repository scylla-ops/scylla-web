# `@scylla/ui` — agent guide

The design system: the shadcn-svelte primitives, the generic composites, the rune helpers,
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
| `@scylla/ui/shadcn` | the shadcn-svelte primitives on bits-ui |
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
  layout/                  FeatureHeader, ContextItem, PageTransition, ScyllaLoadingScreen
  motion/                  page transitions, reduced motion
  editor/                  renderCodeMirror (a Svelte action), the CodeMirror theme
  icon.ts                  LucideIcon (the prop type of an icon)
  shadcn/                  shadcn-svelte primitives on bits-ui
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
| How much room the layout left a component | `createMeasuredHeight()` → `{ height, measure }`, and `use:measure` on a container sized by the layout, never by its content |
| A table | `DataTable` (+ `createPagination`) — row keys are business ids, never indices |
| An action the user may not use | `GatedButton` with `allowed={can(…)}` |
| A modal | `ScyllaDialog` (`open`, `onOpenChange`, `title`, `dismissible`). Never `Dialog` + `DialogContent` directly: `ScyllaDialog` rebuilds its content at each opening without recreating `DialogContent`, which is what keeps it closable |
| Confirm a destructive action | `ConfirmOperationAlertDialog` |
| Show a one-time secret | `SecretRevealDialog` |
| Error state | `ErrorState` |
| Class names | `cn()` |
| Toasts | `toast` from `@scylla/ui/utils` (`svelte-sonner`) |
| Light/dark | `getTheme` / `setTheme` / `currentTheme()` (reactive) from `@scylla/ui/stores` |
| A store | `createStore` from `@scylla/ui/stores`; rune code reads it with `toRune(store)` |
| Translating | `t()` from `@scylla/ui/i18n`, over a `*.messages.ts` |
| A page transition | `PageTransition` — the core's router already wraps every page in it |

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

DOM measurement is a **Svelte action**, never an effect: `createMeasuredHeight()` returns
`{ height, measure }` and the caller writes `use:measure`.

`motion/` holds the transitions. `prefersReducedMotion()` is not optional decoration: the
`@media (prefers-reduced-motion: reduce)` block in `styles.css` neutralises CSS animations, but a
Svelte transition writes inline styles from JavaScript and that query never sees it — every
transition here asks and collapses its duration to zero.

### `shadcn/` — the primitives

The shadcn-svelte primitives, on **`bits-ui`**, with the Tailwind class strings of the old
shadcn/ui components copied verbatim. Import them from `@scylla/ui/shadcn`. A primitive is ported when its
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
  `Dialog`, `DialogTrigger`, `DialogClose`, `DialogPortal`, `AlertDialog`, `AlertDialogTrigger`.
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

## Rules that bite here

- **`selectionStore` is keyed by feature.** `createSelection('jobs')` and
  `createSelection('users')` are independent. Never add a second selection store.
- It and `contextStore` (scylla-base, `@platform/context`) are the app's **only** two global UI
  stores (`permissionsStore` in `@platform/authz` holds the permissions). Everything else is TanStack
  Query (server state) or local `$state`.
- **Never put server state in a shared store.**
- A component used by ≥ 2 features moves here and gets exported from its group barrel — when
  it passes the test above. A component used by one stays in that feature.
- `shadcn/` is ported shadcn-svelte. Prefer composing over editing; if you must edit, keep the
  upstream API.
- Adding to `@scylla/ui` needs a second real usage. One usage stays inline.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`. After moving a component between modules:
`node scripts/restore-translations.mjs`.
