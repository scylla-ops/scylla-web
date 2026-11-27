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
| `@scylla/ui` | the composites (`DataTable`, `ScyllaDialog`, `FeatureHeader`, `ScyllaForm`, `Widget`, `Chart*`, …) and `LucideIcon` |
| `@scylla/ui/primitives` | the primitives on bits-ui, adapted from shadcn/ui |
| `@scylla/ui/state` | rune states: `createSelection`, `createPagination`, `createFeatureSelection`, `createMeasuredHeight`, `createCompactContainer`, `createNow` |
| `@scylla/ui/stores` | `createStore`, `toRune`, `selectionStore`, the theme store |
| `@scylla/ui/i18n` | `t`, `activeLocale`, `intlLocale` (the locale for `Intl`, `en` before the first activation), `formatNumber` (a decimal, a percent or a large number in the language of the UI), `setAppLocale` (writes nothing in the browser), `chooseAppLocale` (the choice of the person: it writes `scylla-locale`), `registerCatalogs`, `readCatalogs` (the messages of a locale, not activated), `plainMessage` |
| `@scylla/ui/utils` | `cn`, `toast`, `copyToClipboard` (writes, then toasts the result, with an optional second line), `matchesSearch` (case and accents do not count), `fuzzyMatch`, `prepareFuzzyText`, `prepareFuzzyQuery`, `normalizeText` (a search with typing errors) |
| `@scylla/ui/structs` | `PaginationParams`, `PaginationInfo`, `PaginatedList`, `GlyphAvatar` and its constants (`GLYPH_SHAPES`, `SCYLLA_GLYPH_AVATAR`, `glyphAvatarKey`) — plain shapes, the only part a `domain/` may import |
| `@scylla/ui/styles.css` | Tailwind, the theme tokens, the `@source` of every package — imported once, by `apps/web` |
| `@scylla/ui/assets/*` | the logos |

## Structure

```
src/
  index.ts                 `@scylla/ui` — re-exports the groups below
  chart/                   ChartSegment, ChartDot, ChartLegendItem, ChartDelta, ChartHeatCell,
                           ChartSlot, ChartRing: the marks of the charts of a widget
  controls/                IconButton, GatedButton, PasswordInput, SearchSelect, SegmentedControl,
                           ShareLinkButton, ColorPicker, ColorSwatches, IconPicker, IconField,
                           GhostItem, Chip, GlyphAvatarEditor, GlyphAvatarDialog,
                           GlyphAvatarCredit
  data-display/            DataTable, Pagination, PaginationSlot, StatusShape, StatusTrail,
                           CopyableText, TruncatedText, EntityIcon, ColorGlyph, CompactCard,
                           ListRow, Tile, DropSlot
  feedback/                ScyllaDialog, ErrorState, EmptyState, ConfirmOperationAlertDialog,
                           SecretRevealDialog
  forms/                   ScyllaForm, FormDialog, createFormState, FormItem types
  layout/                  FeatureHeader, ContextItem, DangerZone, PageTransition,
                           ScyllaLoadingScreen, keepFitted (an attachment: fits a view again at
                           each resize)
  widget/                  Widget, WidgetGrid, WidgetState: the frame of a dashboard widget
  motion/                  page transitions, reduced motion, a spring easing, enter and exit
                           (fade and rise), fold and unfold (height and fade), reflow (the move
                           of the items of a list), swap (a cross-fade of a value), a count
                           that rolls
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

A date, a time or a number that the user reads follows the language of the UI, also when it
changes after the first render (the language of the server comes after the load). Read the
locale with `intlLocale()` and format a number with `formatNumber`: both read the rune of the
locale, thus a template or a `$derived` that calls them renders again at a switch. Do not read
`i18n.locale` of Lingui for this, and do not call `toLocaleString()` or `toFixed()` for a text:
they use the language of the browser or no language.

## Reuse these — do not reinvent

| Need | Use |
|---|---|
| Row selection | `createSelection(key)` over the single `selectionStore` — **no per-feature selection store** |
| Selection for a list header | `createFeatureSelection(key, () => ids, { deleteItem })` → `headerProps` for `FeatureHeader` |
| List header (count, clear, delete, new) | `FeatureHeader` |
| A form | `FormItem[]` → `ScyllaForm`; `FormDialog` wraps it; `createFormState(() => items)` owns values/validation. Declare the ids in the item type (`readonly FormItem<'name' \| 'description'>[]`) and `onSubmit` receives a typed `FormValues` record — never re-index the values by hand. A field that is not text or a choice (an `IconField`) goes in the `leading` snippet of `ScyllaForm`, before the items, or in `trailing`, after them (a group picker); the owner keeps its value and sends it with the values |
| Pagination | `createPagination(options)` — local page merged with server `totalCount`/`totalPages`; `responsive: true` sizes the page to the container |
| How much room the layout left a component | `createMeasuredHeight()` → `{ height, measure }`, and `{@attach measure}` on a container sized by the layout, never by its content |
| A table | `DataTable` (+ `createPagination`) — row keys are business ids, never indices. Give each column `meta.card` (see "`DataTable` on a phone") |
| A table that `DataTable` cannot express (rows of groups, a matrix) | `TableFrame` + `Table` + `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`. Never a `<table>` by hand. Inside a card that has its own border: no `TableFrame`, a `relative overflow-x-auto p-1.5` box |
| The pages of a table | `PaginationSlot` under the table, outside its frame: the range on the left, `‹ page / pages ›` on the right |
| The status of one run | `StatusShape` (`state`, `label`, `size`): the four dots of the logo take the form of the state. See "`StatusShape`" |
| A row of statuses in time (the last runs) | `StatusTrail`: one dot per item, oldest first, linked by lines; the last dot is a little bigger. Each dot has `data-item-id`; with `onSelect` it is a button |
| A password field | `PasswordInput`: an `Input` with a show / hide button (`aria-pressed`), hidden again after a submit. `ScyllaForm` uses it for `inputType: 'password'`. Never `<Input type="password">` |
| An action the user may not use | `GatedButton` with `allowed={can(…)}` |
| Give the link of a page to another person | `ShareLinkButton` (`url`, `hint`). The top bar of the core renders it for a route with `share`: a page does not render it |
| The icon of an entity (a project, an agent): a glyph in a color, or an image | `EntityIcon` (`icon`, `color`, `image`, `size` 16, 20, 24, 32, 36 or 48). A free color `#RRGGBB` goes through `iconColors` (`utils/color.ts`): under 3:1 with the card of the theme, the tile is solid with a white or near-black glyph. The glyphs of a picker are `ENTITY_GLYPHS` |
| An item of a dense grid: a smaller card | `CompactCard` (`title`, `icon`, `badge`, `subtitle`, `actions`, `footer`, `selected`, `interactive`): the icon, the title and the actions on one line, centered, then the footer. The cards of a row have the same height |
| An item of a list, one row each | `ListRow` (`title`, `icon`, `badge`, `subtitle`, `meta`, `actions`, `stacked`, `selected`, `interactive`): 48 px, each part centered on one line. `stacked` (a phone) puts the subtitle and `meta` on a second line, and the icon and the actions stay centered on the row |
| A small tile of an overview (the health of each item) | `Tile` (`title`, `icon`, `status`, `actions`, `selected`, `interactive`): the icon, the title and the status centered on both axes; `actions` in the top right corner |
| The place where a dragged item goes | `DropSlot` (`shape`: `card`, `row`, `header` or `tile`, from `DROP_SLOT_SHAPES`; `children`: a text, centered). Give it the shape of the item, so that the grid does not jump. With no text it is `aria-hidden`: a live region says the place |
| « New … » as the last item of a grid or a list | `GhostItem` (`label`, `shape`: `card`, `row` or `tile`, from `GHOST_ITEM_SHAPES`; `icon`, `Plus` by default; `href` for a link, else `onclick`): a dashed item, its content centered on both axes |
| A small item in a line: a name with its icon, or "+N" | `Chip` (`icon` snippet, `variant`: `default` or `more`, the button attributes): 28 px, rounded, the content centered |
| A glyph in a color with no tile (the folder of a group of projects) | `ColorGlyph` (`icon`, `color`, `label`, `class` for the size, 16 px by default): the outline in the color on its tint. A free color under 3:1 with the card fills the glyph, with a white or near-black outline (`iconColors`). No color: grey, with no fill |
| Choose the icon of an entity | `IconPicker` (`value`: an `IconChoice`, `onchange`, `title`, `recent`, and the default icon of the entity: `defaultGlyph`, `defaultColor`): the glyphs with a search, the colors of the theme, the free color, the image tab, and with `avatar` (a person or an App only) the Avatar tab: a `GlyphAvatarEditor` with no preview of its own, which gives `{ kind: 'avatar' }`. The owner puts it in a `ScyllaDialog` and saves. The free color is `ColorPicker`, which also works alone |
| A glyph avatar (DiceBear "Glyphs", the only style) of a person or an App | `GlyphAvatarEditor` (`value`, `onchange`, `recent`, `preview`, `square`): the 35 shapes and the Scylla head, the glyph and background paints (solid, linear or radial, with an angle), and flip, rotation and size behind "More". `GlyphAvatarDialog` puts it in a dialog (a sheet from the bottom on a phone) with Save. `glyphSvg` and `glyphDataUri` draw it in the browser with `@dicebear/core` 11 and `GlyphAvatar/glyph-style.json`. scylla-ce draws the same SVG with `dicebear-core` and the same file: `glyph-avatar.fixtures.json`, the same file in the two repositories, checks it. A change of the style is a change of the two copies. `GlyphAvatarCredit` is the credit that the license CC BY 4.0 of the style asks for: the editor and the account page show it. "Random" (`randomGlyphAvatar`) picks explicit values: the server keeps the options, never a seed |
| The icon in a form that creates or edits an entity | `IconField` (`value`, `onchange`, `recent`, `defaultGlyph`, `defaultColor`, `disabled`): the label, the preview, "Change the icon" and Reset on one line; the button unfolds the `IconPicker` (with no header) under them. Nothing is saved: the owner sends the choice with the other fields at the submit. The field keeps the URL of a new image while the picker is closed, and frees it when it goes away. Every create and edit form of an entity with an icon has it |
| Choose a color, with no icon (the initials of a person) | `ColorSwatches` (`value`: a color of the theme or `#RRGGBB`, `onchange`, `recent`, `preview`): the colors of the theme (`SWATCH_COLORS`), then the free color in a popover with `ColorPicker`. `IconPicker`, the profile initials and the folder colors of the project groups use it, so each picker of the app offers the same colors. `onchange` comes at each move of the free color: a caller that saves at once waits for the end of the moves |
| The glyph or the initials on a solid tile of a color | `glyphOn(rgb)` (white or near-black, the one that contrasts more), with `colorIn(color, theme)`: a free color, or a color of the theme from `THEME_COLORS` (the tokens of `styles.css`, which `styles.test.ts` compares) |
| A select with a search | `SearchSelect`, with `options` as data. `row` draws a richer option. `chip` shows the choice as a chip in the field: the text of the field is then the search only, and the owner clears its value to remove the chip. Use `Select` only for a short fixed list |
| One choice out of a few: a filter, a mode, a period | `SegmentedControl`, with `options` as data (a count, a dot, an icon). `fill` for equal columns over the full width, `size="sm"` in a toolbar. See "`SegmentedControl`". Not for real tabs (`Tabs`) or for a choice of several (`ToggleGroup type="multiple"`) |
| A modal | `ScyllaDialog` (`open`, `onOpenChange`, `title`, `dismissible`, and `data-*` attributes, which go on its content). Never `Dialog` + `DialogContent` directly: `ScyllaDialog` rebuilds its content at each opening without recreating `DialogContent`, which is what keeps it closable |
| Confirm a destructive action | `ConfirmOperationAlertDialog`; give it a `continueLabel` that says what the action does ("Deactivate"), else it says "Continue". Its button is destructive; `variant="default"` for an action that takes nothing away ("Reactivate") |
| An action that deletes, removes, revokes, disables or deactivates | The destructive variant, never a red class. See "Destructive actions" |
| The section of a settings page with the actions that cannot be undone | `DangerZone` (`title`, `description`, `action`: the destructive button, centered on the text or under it in a narrow card, `children`) |
| Show a one-time secret | `SecretRevealDialog` |
| Error state | `ErrorState` |
| A list, a table or a section with no item yet | `EmptyState` (`icon`, `title`, `description`, `action`: `{ label, onSelect, icon }`, `Plus` by default). The action adds the first item in the context of the page (the project, the pipeline, the scope). Give it only to a person who can do it: with no `action`, no button shows. Never a bare sentence for an empty list. The icon and the title have their own grid row between rows of 2fr and 3fr, so a longer text does not move them |
| Class names | `cn()` |
| Toasts | `toast` from `@scylla/ui/utils` (`svelte-sonner`) |
| Light/dark | `getTheme` / `currentTheme()` (reactive): the theme on screen. `getThemePreference` / `currentThemePreference()` / `setThemePreference(choice, origin?)`: the choice of the user (`light`, `dark` or `system`), from `@scylla/ui/stores` |
| A store | `createStore` from `@scylla/ui/stores`; rune code reads it with `toRune(store)` |
| Translating | `t()` from `@scylla/ui/i18n`, over a `*.messages.ts` |
| A page transition | `PageTransition` — the core's router already wraps every page in it |
| A dashboard: a grid of widgets | `WidgetGrid` around `Widget`s (`size`: `xs`, `s`, `m`, `l`). See "Widgets" |
| A widget with no data to draw (loading, error, empty, all clear, locked, missing) | `WidgetState` inside the `Widget`, with the same `size`. Its `action` has a `RotateCw` icon by default; an empty state that adds the first item gives `icon: PlusIcon` |
| A mark of a chart: a bar, a legend, a change, a ring | The `Chart*` parts. See "Charts" |
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
first paint: keep the two in step (no value means dark). **No cookie and no storage key without
a registry entry:** a store, a state or a primitive of `@scylla/ui` that writes a new key adds
its entry to the tracker registry of scylla-base (`platform/trackers`), in the same change. A
key that is not exempt also names its consent purpose, and the consent framework of scylla-base
(`platform/consent`) then asks the user. Its test reads the files of this package too. `system` follows
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

Each element that appears, goes away or moves after the first paint has a motion, and the same
kind of element has the same motion everywhere. Use these presets, never a new duration:

| What changes | Use | Time |
|---|---|---|
| A part that appears in its place: an empty state, a banner over the page, the content that replaces a skeleton | `in:enter` (fade and a rise of 4 px) | 200 ms, ease out |
| A part out of the flow that goes away: an overlay, a floating bar | `out:exit` (fade) | 150 ms, ease in |
| A part that opens or closes in the flow: a message under a field, a folding section, a banner, a row of a list | `in:unfold` and `out:fold` (height and fade) | 220 ms in, 150 ms out |
| The items of a keyed `{#each}` that change places when one comes, goes or moves (rows, the widgets of the dashboard, the cards of the projects page) | `animate:reflow` (a slide from the old box; `{ still: true }` keeps a dragged item still) | 200 ms, ease out |
| The content of a tab that becomes active | `{@attach enterOnActivate}` (`TabsContent` has it) | as `enter` |
| A number that changes | `createCountRoll(() => count)` (`rollIn`, `rollOut`, `pulse`) | 370 ms spring in, 220 ms out |
| A value that takes the place of another, as an icon | `swapIn` and `swapOut` | 240 ms spring in, 120 ms out |
| A modal (dialog, alert dialog, sheet) and its backdrop | `MODAL_TIMING_CLASS` (`dialog/dialog-variants.ts`) | 200 ms ease out in, 150 ms ease in out |

- **No motion at the first paint.** A Svelte transition is local: it plays when its own block
  (`{#if}`, `{#each}`, `{#key}`, `{#await}`) changes, not when a block above it is created. The
  router renders each page in a new `{#key}` (`RouteEntry`), thus a page plays only the page
  transition when it mounts, and its parts play their motion on a change. A test that renders a
  component at its root has no block above it: the root element plays its `in:`.
- **The primitives `Card`, `Badge`, `TableFrame` and `TableRow` have `in:enter`.** A card or a
  table that replaces a skeleton, and a row that comes after the first render, fade in with no
  code in the feature. A row has no exit: a new page of rows would wait for the old one.
- **`fold` and `unfold` take in the gap of a flex column** around the part (`row-gap`), so the
  parts around do not jump. A gap of another layout (a grid, `space-y`) is not taken in: put the
  space in the padding of the part.
- **An `out:` keeps the element in the DOM while it runs**, `inert`. In jsdom the animation never
  ends (`setup.ts`), thus the element stays. A test that checks that an element went away sets
  `prefers-reduced-motion: reduce` (`window.matchMedia`): each preset then has a duration of 0
  and the element goes at once. The end-to-end tests run with reduced motion.
- `swapIn` and `swapOut` need the two values in one grid cell (`grid` on the parent,
  `col-start-1 row-start-1` on the child) in a `{#key}`, so the place keeps its size. So does the
  count roll.

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
- **A modal content (`DialogContent`, `AlertDialogContent`, `SheetContent`) renders its element
  through the `child` snippet of bits-ui.** With `children`, bits-ui keeps `pointer-events: none`
  on `<body>` until the exit animation ends, and a click in that time is lost. With `child`, the
  lock ends when the modal closes. The overlay and the content also get `CLOSING_LAYER_CLASS`
  (`dialog/dialog-variants.ts`): while they fade out, the pointer goes through them. The test
  "gives the page back to the pointer when it closes" of each of the three fails without this.
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
- **A submenu is in a portal, as its menu.** bits-ui puts `DropdownMenuSubContent` in the menu,
  `absolute`. The menu is a `relative` scroller, thus it clips the submenu, which is beside it:
  the submenu opens, but it is not visible. `dropdown-menu.test.ts` fails when the submenu is in
  the menu.
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
`data-display/status-state.ts`): `pending` / `idle` a hollow dashed ring in `muted-foreground` (an SVG that fades over the canvas; never a grid of dots, it reads as a drag grip); `running` the
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

## `ShareLinkButton`

The button of the top bar that gives the link of the page: outline, 32 px, a `Link` icon, a
tooltip below it. `url` gives the link (default: the address of the page at the click); `null`
hides the button. `hint` is the second line of the toast, e.g. who can open the link.

- **A computer copies, a phone shares.** With a coarse pointer and `navigator.share`, the label is
  "Share link" and a click opens the share sheet of the system. Else the label is "Copy link" and
  a click writes the clipboard. A computer can have `navigator.share`: it still copies.
- A copy or a share shows the check (`text-status-passed`) for 2 s and a toast ("Link copied",
  "Link shared") with `hint`. A refused copy shows the error of `copyToClipboard` and tells to
  copy the address from the address bar. A cancelled share sheet (`AbortError`) tells nothing;
  a share that fails for another reason copies.
- The focus stays on the button. The toaster (`aria-live="polite"`) announces the result.

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
- **A count rolls** (`motion/count-roll.ts`): the old number leaves and the new one enters,
  up when the count grows. The chip is `aria-hidden` and an `sr-only` copy gives the current
  count to the name of the radio: the leaving number stays in the DOM during its transition (and
  in jsdom, where the animation never ends), and must not go into the name.
- **A dot with `pulse`** grows a ring when its count grows.
- `prefers-reduced-motion`: no stretch, no bounce, no roll and no pulse. The thumb slides in
  150 ms and the colors change in 150 ms.

## Widgets

The design is the page "Dashboard · widget set (proposal)" of the design file (node `1686:339`).
The Figma copies of `Widget`, `WidgetState` and `Chart/*` are local copies there, until the
library "scylla :: ui" publishes its page Widget.

- **The grid has 8 columns, or 2 columns below 768 px of its own width.** `WidgetGrid` is a
  container (`@container`), and the classes use the container variant `@3xl:`, not the viewport.
  The sidebar takes part of the screen, thus the viewport does not tell the room of the grid.
- **The numbers are in `widget-size.ts`, in one place.** `WIDGET_GRID` gives the columns, the
  row height and the gap of each layout: 98 px rows and 16 px gaps (wide), 80 px rows and 12 px
  gaps (narrow). `WIDGET_SPANS` gives the cells of each size. The components read them through
  CSS variables (`widgetGridStyle`, `widgetSpanStyle`) and the classes `col-span-(--…)`. Do not
  write a span or a row height as a literal class.
- **A widget places itself.** `Widget` sets its own span from its `size`. `grid-flow-row-dense`
  fills a hole with a later small widget.
- **A widget has a border and a faint fill**: `bg-muted/30`, no shadow. The fill parts the
  widget from the page in the two themes. Do not use `bg-card`: in the light theme, `--card` is
  the color of the page. Only the dashboard uses `Widget`, so the fill changes no other page.
- **The header is one line of 20 px**: the icon, the title (an `h3`), `meta` and `aside` at the
  end. `aside` holds a count, a state or actions. In the size `xs` the header is small (12 px
  text), and the content is centered under it. `bare` keeps the header for the screen readers
  only, for a content that shows its own title.
- **The padding is 24 px (16 px on a phone), 12 × 20 px for `xs`.** The corners are 16 px.
- **The size of a phone is not the size of the design for `l`.** The design draws `l` 370 px
  high on a phone. Four rows of 80 px and three gaps give 356 px.
- **`WidgetState` replaces the content, not the widget.** The header stays: the user still sees
  which widget it is. Each state has a generic title and description; a widget gives its own
  texts (`title`, `description`). The action (Retry, Choose data) does not show in the size
  `xs`. `loading` is a `status` with a skeleton for each size.

## Charts

The `Chart*` parts are marks, not charts: the widget draws its chart with them.

- **`ChartTone`** names a color: the states of a run (`passed`, `failed`, `running`, `queued`,
  `canceled`, `skipped`) and `primary`, `info`, `warning`, `muted`. `chart-tone.ts` maps it to
  the theme tokens. Do not give a mark a color class of its own.
- **`ChartSegment` takes its size from the caller** (`class`): a bar, a part of a stacked bar,
  the fill of a meter, a cell of a strip.
- **`ChartDelta` does not compute.** The widget gives the text ("+3.4 pts"), the direction and
  the tone. `deltaTrend(change, better)` gives the direction and the tone from a change.
- **`ChartRing` holds at most 3 arcs** over a muted track. `ringArcs` (plain TypeScript, tested
  in node) places them: a gap after each arc when there are several, a minimum length so that a
  small part stays visible. The value in the middle is HTML over the SVG, not an SVG `text`.
  `label` is the accessible name of the ring.

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
- **A color class names a token of the theme** (`text-success`, `bg-info/5`), never a color of
  the default palette of Tailwind (`text-green-500`, `bg-black`, `text-white`). A palette color
  does not change with the theme. A new color is a new token in `styles.css`. The dim layer
  behind a modal, a sheet or the tour is `bg-overlay/<opacity>`, and a line on it is
  `overlay-foreground`: the two tokens are the same in the two themes.
  `__test__/theme-colors.test.ts` fails when a class string of `apps`, `packages`, `sdks`,
  `extensions` or `catalog` names a palette color.
- **A choice card centers its control.** A radio, a checkbox or a switch in a `Label` (a card
  with a title and a description, or a row) is centered vertically on the whole label, not on
  the line of the title: `items-center` on the label, and no `items-start`, `items-baseline`,
  `self-start` or top margin between the label and the control.
  `extensions/scylla-base/src/shell/__test__/choice-cards.test.ts` fails when a label of
  scylla-base or of `@scylla/ui` does not obey this rule. It also reads each class of these two
  packages that places a control by a selector (`[role=checkbox]`, `data-slot=field-content`),
  for example the variants of a `Field`, and fails when this class puts the control on the
  first line.
- **A card header centers its action.** `CardAction` is centered vertically on the title and
  the description (`self-center`), not on the line of the title. `DangerZone` and the
  `SettingsSection` of scylla-base put the action beside the text, or under it when the card is
  too narrow for both (a phone): the header is `flex flex-wrap items-center`, and the text is a
  block with `grow basis-64`.
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
