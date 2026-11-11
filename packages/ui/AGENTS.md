# `@scylla/ui` — agent guide

The design system: the primitives (adapted from shadcn/ui), the generic composites, the rune states,
the stores, i18n rendering and the theme tokens. **No business meaning.**

**Package** `packages/ui` · the bottom of the workspace

## Import rules — the hard one

- **`@scylla/ui` MUST NOT import another package of the workspace** (`ui-is-generic`, error).
  It is the bottom of the graph and depends on nobody.
- Everyone may import it, **through its entry points only** (`package-api-only`, error).
- **Test before adding anything here:** could this live in another product, unchanged? If it
  mentions a pipeline, a job, a role or an workspace, it is not UI — it belongs to the
  feature, or to the `shared/` folder of its extension.

## Entry points

| Import | What |
|---|---|
| `@scylla/ui` | the composites (`DataTable`, `ScyllaDialog`, `FeatureHeader`, `ScyllaForm`, …) and `LucideIcon` |
| `@scylla/ui/primitives` | the primitives on bits-ui, adapted from shadcn/ui |
| `@scylla/ui/state` | rune states: `createSelection`, `createPagination`, `createFeatureSelection`, `createMeasuredHeight`, `createCompactContainer`, `createNow` |
| `@scylla/ui/stores` | `createStore`, `toRune`, `selectionStore`, the theme store |
| `@scylla/ui/i18n` | `t`, `activeLocale`, `setAppLocale`, `registerCatalogs`, `readCatalogs` (the messages of a locale, not activated), `plainMessage` |
| `@scylla/ui/utils` | `cn`, `toast`, `copyToClipboard` (writes, then toasts the result), `matchesSearch` (case and accents do not count), `fuzzyMatch`, `prepareFuzzyText`, `prepareFuzzyQuery`, `normalizeText` (a search with typing errors) |
| `@scylla/ui/structs` | `PaginationParams`, `PaginationInfo`, `PaginatedList` — plain shapes, the only part a `domain/` may import |
| `@scylla/ui/styles.css` | Tailwind, the theme tokens, the `@source` of every package — imported once, by `apps/web` |
| `@scylla/ui/assets/*` | the logos |

## Structure

```
src/
  index.ts                 `@scylla/ui` — re-exports the groups below
  controls/                IconButton, GatedButton, SearchSelect, SegmentedControl
  data-display/            DataTable, Pagination, PaginationSlot, StatusShape, StatusTrail,
                           CopyableText, TruncatedText
  feedback/                ScyllaDialog, ErrorState, ConfirmOperationAlertDialog, SecretRevealDialog
  forms/                   ScyllaForm, FormDialog, createFormState, FormItem types
  layout/                  FeatureHeader, ContextItem, DangerZone, PageTransition,
                           ScyllaLoadingScreen
  motion/                  page transitions, reduced motion, a spring easing
  editor/                  renderCodeMirror (an attachment), the CodeMirror theme (`flush`: no
                           frame, for an editor that fills a pane with its own borders)
  icon.ts                  LucideIcon (the prop type of an icon)
  primitives/              the primitives on bits-ui, one folder per primitive
  state/  stores/  i18n/  utils/  structs/     the entry points above
  assets/  styles.css
  locales/                 the catalog of these components
```

## Design tokens and Figma

The code is the source of truth, and the Figma library "scylla :: ui" follows it. After a change
of a token in `styles.css` (`:root`, `.dark`, `@theme inline`), run `pnpm tokens:export` and
commit `tokens/` with it. `pnpm tokens:check`, the CI step "Design tokens" and
`scripts/__test__/design-tokens.test.mjs` fail when `tokens/` is not the export. The full process
(the token files, Figma, a new component, the fleet) is in [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md).

## The catalog: `catalog/`

Each component that `@scylla/ui` or `@scylla/ui/primitives` exports has an entry in the visual
catalog (Storybook, `pnpm ui:catalog`), with its variants, sizes and states.
`__test__/catalog.test.ts` fails when a component has no story that imports it. A new component,
a new variant or a new state: add or change its entry in `catalog/src/` in the same change. How:
`catalog/AGENTS.md`.

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
| A table that `DataTable` cannot express (rows of groups, a matrix) | `TableFrame` + `Table` + `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`. Never a `<table>` by hand. Inside a card that has its own border: no `TableFrame`, a `relative overflow-x-auto p-1.5` box |
| The pages of a table | `PaginationSlot` under the table, outside its frame: the range on the left, `‹ page / pages ›` on the right |
| The status of one run | `StatusShape` (`state`, `label`, `size`): the four dots of the logo take the form of the state. See "`StatusShape`" |
| A row of statuses in time (the last runs) | `StatusTrail`: one dot per item, oldest first, linked by lines; the last dot is a little bigger. Each dot has `data-item-id`; with `onSelect` it is a button |
| An action the user may not use | `GatedButton` with `allowed={can(…)}` |
| A select with a search | `SearchSelect`, with `options` as data. `row` draws a richer option. `chip` shows the choice as a chip in the field: the text of the field is then the search only, and the owner clears its value to remove the chip. Use `Select` only for a short fixed list |
| One choice out of a few: a filter, a mode, a period | `SegmentedControl`, with `options` as data (a count, a dot, an icon). `fill` for equal columns over the full width, `size="sm"` in a toolbar. See "`SegmentedControl`". Not for real tabs (`Tabs`) or for a choice of several (`ToggleGroup type="multiple"`) |
| A modal | `ScyllaDialog` (`open`, `onOpenChange`, `title`, `dismissible`, and `data-*` attributes, which go on its content). Never `Dialog` + `DialogContent` directly: `ScyllaDialog` rebuilds its content at each opening without recreating `DialogContent`, which is what keeps it closable |
| Confirm a destructive action | `ConfirmOperationAlertDialog`; give it a `continueLabel` that says what the action does ("Deactivate"), else it says "Continue". Its button is destructive; `variant="default"` for an action that takes nothing away ("Reactivate") |
| An action that deletes, removes, revokes, disables or deactivates | The destructive variant, never a red class. See "Destructive actions" |
| The section of a settings page with the actions that cannot be undone | `DangerZone` (`title`, `description`, `action`: the destructive button, `children`) |
| Show a one-time secret | `SecretRevealDialog` |
| Error state | `ErrorState` |
| Class names | `cn()` |
| Toasts | `toast` from `@scylla/ui/utils` (`svelte-sonner`) |
| Light/dark | `getTheme` / `currentTheme()` (reactive): the theme on screen. `getThemePreference` / `currentThemePreference()` / `setThemePreference(choice, origin?)`: the choice of the user (`light`, `dark` or `system`), from `@scylla/ui/stores` |
| A store | `createStore` from `@scylla/ui/stores`; rune code reads it with `toRune(store)` |
| Translating | `t()` from `@scylla/ui/i18n`, over a `*.messages.ts` |
| A page transition | `PageTransition` — the core's router already wraps every page in it |
| Panels the user can resize | `ResizablePaneGroup`, `ResizablePane`, `ResizableHandle` (`@scylla/ui/primitives`, on paneforge). See "`resizable`" below |
| A card that opens on hover and holds links | `HoverCard`, `HoverCardTrigger`, `HoverCardContent` (bits-ui `LinkPreview`). A `Tooltip` holds text only: it must not hold a link. See "`hover-card`" below |

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

## Rune states: `state/`

Four rules bite here:

- **A measure stays when its element goes away.** `createMeasuredHeight` gives `null` only before
  the first attach. The page size is part of a query key, and a page can show `ErrorState` in
  place of the measured element. If the height goes back to `null`, the key changes, the error
  goes away, the element comes back and the query fetches again. The result is a request loop.
- **A list that arrives later is passed as a getter, not an array.** `createFeatureSelection`
  takes `() => string[]` and `createFormState` takes `() => items`. Capturing the value once
  freezes the helper on whatever the first, usually empty, render held.
- **`toRune(store)`** (`stores/to-rune.adapter.svelte.ts`) is how rune code reads a store. It is built on
  `createSubscriber`, so the subscription starts only while something is reading and the helpers
  stay testable in plain TypeScript, outside any component.
- **Derive instead of mirroring.** `createPagination` derives its page size from the measured
  height, so there is no effect and no frame where the two disagree. Only "the user picked a
  size" is remembered, because nothing else records it.

DOM measurement is an **attachment**, never an effect: `createMeasuredHeight()` returns
`{ height, measure }` and the caller writes `{@attach measure}`.

The theme store keeps the choice of the user (`light`, `dark`, `system`) under the
`localStorage` key `scylla-theme`, which the inline script of `index.html` reads before the
first paint: keep the two in step (no value means dark). `system` follows
`prefers-color-scheme`, also when it changes. `setThemePreference(choice, origin)` with an
origin spreads the new theme from that point as one circle (View Transitions API, 450 ms); with
no origin, no API or a reduced motion setting, the swap is instant. The account page of
scylla-base is the only place that changes the theme.

`motion/` holds the transitions. `prefersReducedMotion()` is not optional decoration: the
`@media (prefers-reduced-motion: reduce)` block in `styles.css` neutralises CSS animations, but a
Svelte transition writes inline styles from JavaScript and that query never sees it — every
transition here asks and collapses its duration to zero. `springEasing({ bounce, duration })`
gives a spring as an easing, with the parameters of the design tools: the thumb of
`SegmentedControl` and the rail tile of the core use it.

### `primitives/` — the primitives

The primitives, on **`bits-ui`**. They are adapted from the React components of shadcn/ui (MIT,
see `primitives/README.md`): the Tailwind class strings were copied, then changed where the design
needed it. They are our code now, not vendored code: no CLI and no upstream update manage them. Import them from `@scylla/ui/primitives`. A primitive is ported when its
first consumer needs it — there is no primitive here without a consumer.

**`command`** (`primitives/command/`) is on `Command` of bits-ui. `CommandInput` puts `autofocus` on the
`<input>` element, because `DialogContent` gives the focus to the `[autofocus]` element, and the bits-ui
input removes this attribute.

**`resizable`** (`primitives/resizable/`) is on **`paneforge`** (listed in the `vendor-ui` chunk and a
peer dependency, like bits-ui). `ResizablePaneGroup` and `ResizableHandle` are wrappers;
`ResizablePane` is paneforge's `Pane` aliased, and `ResizablePaneApi` is its `PaneAPI` type.

- **Sizes are percent** of the group (`defaultSize`, `minSize`, `maxSize`), not pixels.
- **A panel that can close** is `collapsible` with `collapsedSize={0}`. Bind the pane
  (`bind:this`) to get `collapse()` / `expand()`, and listen to `onCollapse` / `onExpand` to know
  of a drag that closed or opened it. Keep `defaultSize` constant: it is part of the pane
  constraints, and a change resets the layout of the whole group.
- **A size that lasts** between visits: give the group an `autoSaveId`. paneforge saves one
  layout per set of panes, keyed by their `order` and constraints (not their ids): two modes
  of one pane need different constraints, or they share a layout.
- **A pane that comes and goes** (an `{#if}`, an `{#each}`, a `{#key}`) needs an `id` and an `order`,
  or the group cannot place it. A change of the number of panes resets the layout of the
  group, unless `autoSaveId` restores it.
- **The handle** has the `separator` role, named "Resize panel" (`aria-label` replaces it).
  The group draws no border: the handle is the line between two panes.
- **Animation is in the group's classes**, not in JavaScript: a pane eases its `flex-grow`
  (200 ms) when it collapses, expands or changes size, but not while a pointer drags a handle
  (`data-active="pointer"` on the handle, read with `:has()`), so the drag follows the pointer.
  A pane that collapses during a drag still shrinks smoothly. `motion-reduce` removes it.

**`hover-card`** (`primitives/hover-card/`) is on `LinkPreview` of bits-ui, the name that bits-ui
gives to the hover card of Radix. `HoverCard` and `HoverCardTrigger` are aliased, `HoverCardContent`
is a wrapper in a portal.

- The trigger is an `<a>`. Give it your element with the `child` snippet, for example a `<button>`.
  The trigger has `aria-expanded` and `data-state="open"` while the card is open.
- The card opens on hover and on a focus from the keyboard, after `openDelay` (700 ms by default).
- As in Radix, the card is for a pointer. It is at the end of `<body>`, so Tab from the trigger
  does not go into it, and it closes when the trigger loses the focus. A keyboard reads the card,
  but does not use its links: put each link also on a page that a keyboard can open.

The sidebar (`Sidebar*`, `setSidebar` / `getSidebar`) keeps its open state in a Svelte context
that `SidebarProvider` creates. `sidebar.state.svelte.ts` holds it; the mobile layout uses the
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
- **Use `SearchSelect` before the `Combobox` parts.** The people field of `AddMembersDialog` uses
  the parts, because it holds chips and free text. The parts have these traps:
  - `Combobox.Input` does not open on a click. Open the list in `onclick`.
  - The default of `allowDeselect` is `true`. Set it to `false`, or a second pick clears the value.
  - Enter does not pick an option with an empty value. Give each option a value that is not empty.
  - bits-ui keeps the typed text after a close, and writes the label after a pick. `ComboboxInput`
    shows only its `value` prop, so the owner holds the text.
  - Enter with no highlighted row closes the list. Prevent the default in `onkeydown` to stop this.
  - bits-ui does not set `aria-controls` or `aria-haspopup`. Set them on the input.
  - A row of a floating list has no accessible name in jsdom, because the list has no position. A
    test reads the row with `findFloating`, and a field in the list with its placeholder.
- **A menu gives the focus to its field marked `autofocus`.** Without this field, the menu takes the
  focus. If the field mounts after the menu opens, the field must also take the focus when it
  mounts (`{@attach}`), because Svelte's `autofocus` does nothing while another element has the focus.
- **CSS variable names change**: `--radix-*-content-transform-origin` becomes
  `--bits-floating-transform-origin`, and the select's available-height/anchor-width variables
  likewise. Nothing fails loudly if you miss one.
- **A centered modal does not slide.** Tailwind 4 centers it with the CSS `translate` property.
  tw-animate-css moves it with `transform`. The browser applies the two, thus the shadcn classes
  `slide-in-from-left-1/2` and `slide-in-from-top-[48%]` move the modal in from the left. Use
  `CENTERED_DIALOG_CLASS` (`dialog/dialog-variants.ts`): fade and zoom only.
  `dialog/centered-dialog.test.ts` fails when a source file has a centering translate and a slide.
- **Radix's `Indicator` parts become an `{#if}` in a children snippet** (checkbox, select item),
  because bits-ui hands the state to the snippet instead of mounting a separate node. The
  checkbox takes `indeterminate`: it then shows a dash and has `aria-checked="mixed"`.
- **An item that the user picks shows the pointer, as a button does** (`styles.css`). The shadcn
  classes give `cursor-default` to the items of a menu, a select and a command list: we use
  `cursor-pointer`. A disabled item does not show the pointer.
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
- **`findFloating(role, name?)` / `findTooltip()` from `@test/render.ts`** for anything in a
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

## The design of a table

The primitives `primitives/table/` hold the one design of a table; `DataTable` is built on them.
The rows are **inset**: `TableFrame` (`rounded-2xl`, `border`, `bg-card`) keeps a 6 px margin
around the header and the rows. The header is a grey pill (`bg-muted`, 32 px, the labels in
`text-xs`, not uppercase). The rows are rounded (10 px) and 2 px apart: there is no line between
them. A row with `onclick` is `bg-muted/40` on hover; a selected row (`data-state="selected"`) is
`bg-primary/[0.07]` with an inset 3 px bar of `--primary`, which follows the rounded corner.

- The background goes on the **cells**: a `tr` does not clip it to the rounded corners. A row
  that has its own color writes `[&>td]:bg-…`.
- A cell does not wrap (`whitespace-nowrap`). A cell with long text writes `whitespace-normal`.
- A column that hides at a breakpoint leaves the row without its `last:` corner: the cell before
  it writes `max-md:rounded-r-[10px]`.
- The header of `DataTable` sticks. `computePageSize` counts a row as 58 px and the frame as 48 px
  (`state/responsive-page-size.ts`): keep them in step with these classes.

## `StatusShape`

The four dots of the logo, drawn on a canvas, take a form per state (`StatusState`, in
`data-display/status-state.ts`): `pending` / `idle` the 2 × 2 grid, breathing; `running` the
marbles run round a circle (as the old Windows spinner: slow at the top, fast below, so they
catch up and part); `success` one disc; `failed` and `orphaned` a ×; `skipped` and `cancelled` a
slash. Its accessible name is `label`; `data-state` gives the state to a test.

- **A change of state is a move, never a jump.** Leaving running, the marbles go on from where
  they are, at their speed, and the way out depends on the new state (a spiral into the disc, a
  shot into the cross, a line that shrinks into the slash). Joining running, each form has its
  own way in. `status-shape.engine.test.ts` fails when a dot moves more than 10 units (of 400)
  in a frame.
- **Five files, five roles**: `status-shape.forms.ts` the forms and the colors of each state
  (theme tokens `--status-*`), `status-shape.raster.ts` the metaballs into pixels,
  `status-shape.engine.ts` the springs and the moves (plain TypeScript, no DOM),
  `status-shape.loop.ts` one animation loop for every shape of the page, and
  `status-shape.attachments.svelte.ts` the canvas, the colors of the theme, and no drawing off
  screen.
- **The raster is the hot path**: typed arrays and plain loops, run for each pixel of the box
  around the dots, each frame. Keep it so.
- `prefers-reduced-motion`: every change is instant, nothing breathes or runs.
- jsdom has no canvas: `test/setup.ts` gives no 2D context, and the shape keeps its name only.

## `SegmentedControl`

A toggle group of one choice (`ToggleGroup` of bits-ui: the radios, the arrow keys, Enter and
Space). The selected background is not on the segment: it is one thumb under the segments
(`data-part="segmented-thumb"`), which moves to the new segment.

- **The thumb measures the segments** (`thumb.attachments.svelte.ts`, `offsetLeft` and
  `offsetWidth`, not `getBoundingClientRect`, which a transform of the page changes). A
  ResizeObserver on the track and the segments makes it follow a new label or count. A new
  value stretches it: the leading edge goes first, then both edges settle on a spring
  (`thumb-motion.ts`, plain TypeScript, tested in node). A resize in the middle of a move
  settles from where the thumb is.
- **The value is bound with a function binding** on `ToggleGroup`. A click on the selected
  segment makes bits-ui clear its value; the setter ignores it, thus the segment stays selected.
  With a plain `value` prop and `onValueChange`, bits-ui keeps the cleared value and shows no
  selection.
- **A count rolls** (`count-roll.transition.ts`): the old number leaves and the new one enters,
  up when the count grows. The chip is `aria-hidden` and an `sr-only` copy gives the current
  count to the name of the radio: the leaving number stays in the DOM during its transition (and
  in jsdom, where the animation never ends), and must not go into the name.
- **A dot with `pulse`** grows a ring when its count grows.
- `prefers-reduced-motion`: no stretch, no bounce, no roll and no pulse. The thumb slides in
  150 ms and the colors change in 150 ms.

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

## Destructive actions

An action that deletes, removes, revokes, disables or deactivates something has one look in all
the app: red, and the red comes from a variant.

| Where | Use |
|---|---|
| A menu | `DropdownMenuItem variant="destructive"`. The destructive items are the last items, after a `DropdownMenuSeparator` |
| A button that stands alone: in a header, a settings section, a `DangerZone`, the footer of a dialog | `Button variant="destructive"` |
| An action on each row of a table or a list, or in a side panel | `IconButton variant="destructive"`, or `Button variant="ghost-destructive"` |
| The confirmation | `ConfirmOperationAlertDialog`: its button is destructive |

- Do not make an action red with a class (`text-destructive`, `hover:bg-destructive-subtle`).
  Use the variant.
- A control that removes a row or a value of a form that is not saved yet (an argument, a chip)
  is not destructive.
- `extensions/scylla-base/src/shell/__test__/destructive-actions.test.ts` reads the labels of the
  actions of scylla-base. It fails when an action with a destructive label has no destructive
  variant, when a class makes an action red, or when a destructive menu item is not at the end
  after a separator.

## Rules that bite here

- **All titles use one font, and `styles.css` sets it.** Its `@layer base` gives `font-display`
  and `font-medium` to `h1` to `h6`, to `[role='heading']` and to `[data-slot='card-title']`, and
  one size to each `h1` that is not in a card title. A utility replaces a rule of `@layer base`.
  Thus a title has no font class and no weight class, and an `h1` has no size, `leading-*` or
  `tracking-*` class. `layout/__test__/title-font.test.ts` fails when it has one. Text that is a
  title is a heading element: a `p` with a large or bold class keeps Funnel Sans.
- **A choice card centers its control.** A radio, a checkbox or a switch in a `Label` (a card
  with a title and a description, or a row) is centered vertically on the whole label, not on
  the line of the title: `items-center` on the label, and no `items-start`, `items-baseline`,
  `self-start` or top margin between the label and the control.
  `extensions/scylla-base/src/shell/__test__/choice-cards.test.ts` fails when a label of
  scylla-base does not obey this rule.
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
- **A page that scrolls with the frame ends with `pb-20` on its root.** The `main` of
  `PageTransition` is `absolute` and has the height of the view. A page that is taller goes out
  of this `main`, and the padding of the frame does not go below an absolute box. Thus, without
  its own padding, the last element of the page touches the bottom edge of the window. An
  overlay of the shell (`shell.overlays`) can also float in the last 56 px of the view, at the
  right: the Feedback launcher of the Enterprise build. 80 px holds this zone and a gap. A root
  with `min-h-full` also gets `shrink-0`: else the flex column of the `main` shrinks it to the
  height of the view, and the content goes out below its padding. A page that fills the view
  (`h-full`, with its own scroll area: an editor, the logs, the list of jobs) does not get it,
  because the padding takes height from its content. The frame cannot add this space for all
  pages: a page with its own scroll area has the same content height as a page that is taller
  than the view, thus only the page knows which of the two it is.
- **The frame keeps the band of the overlays free below a page that fills the view.** A module
  gives the height of this band in `shell.bottomInset` (the Feedback launcher: 56 px). The frame
  sets it in `--shell-bottom-inset` on its scroll area (`0px` with no such overlay), and its
  bottom padding is at least this value. Thus the last row of a page that fills the view (the
  pagination of the jobs, the buttons of an editor) stays above the launcher. An element of a
  page that is `fixed` to the bottom of the view adds `var(--shell-bottom-inset,0px)` to its
  `bottom`, as the selection bar of `FeatureHeader` on a phone.
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
- It, `dialogHoldStore` and `contextStore` (scylla-base, `@platform/context`) are the app's **only**
  global UI stores (`permissionsStore` in `@platform/authz` holds the permissions). Everything else
  is TanStack Query (server state) or local `$state`.
- **`dialogHoldStore`** has one field, `held`. While it is true, every `ScyllaDialog` keeps open on
  Escape and on a click outside, hides its close button and each control with
  `data-dialog-dismiss`, and stops its focus trap. A dialog that has a control that closes it (Cancel,
  Close) marks that control with `data-dialog-dismiss`. The guided tour of scylla-base sets the store.
- **Never put server state in a shared store.**
- A component used by ≥ 2 features moves here and gets exported from its group barrel — when
  it passes the test above. A component used by one stays in that feature.
- `primitives/` keeps the shadcn/ui API (part names, `data-slot`, variants), so that a reader
  who knows shadcn knows them. Prefer composing over editing; if you must edit, keep that API.
- Adding to `@scylla/ui` needs a second real usage. One usage stays inline.
- `data-part` marks the inner parts of a composite that code outside may point at:
  `feature-header-new` and `feature-header-selection-bar` (`FeatureHeader`), `code-snippet-copy` (`CodeSnippet`),
  `secret-reveal-secret` / `-next-step` / `-confirm` (`SecretRevealChecklist`), `data-table-row`
  (`DataTable`, in a table and in cards). The onboarding tour of scylla-base uses
  `feature-header-new` and `data-table-row`. Keep them; do not use `data-slot` for this, a primitive
  sets its own.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`. After moving a component between modules:
`node scripts/restore-translations.mjs`.
