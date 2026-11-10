# `catalog/` — agent guide

The visual catalog of `@scylla/ui`: Storybook 10, with Svelte CSF stories. It shows each
component of `@scylla/ui` and `@scylla/ui/primitives`, with its variants, sizes and states, in
the light and the dark theme, with the real tokens of `styles.css`.

**Package** `catalog/` (`@scylla/catalog`) · a tool of this repo. It is not in the app build and
not in the workspace of a host repo.

## Commands

Run them from the repository root.

| Command | What |
|---|---|
| `pnpm ui:catalog` | Compiles the Lingui catalogs, then starts Storybook on <http://localhost:6006> |
| `pnpm ui:catalog:build` | Type-checks the stories (`svelte-check`), then builds the static catalog into `catalog/storybook-static/`. CI does the same |

## Layout

```
.storybook/main.ts        the Svelte, Tailwind and Lingui plugins of the app, the addons
.storybook/preview.ts     the toolbar: Theme (light, dark) and Language (en, fr)
.storybook/catalog.css    @scylla/ui/styles.css, and @source on src/
src/Specimen.svelte       one case of a component, with its name. `state` shows it hovered or focused
src/<group>/<Component>.stories.svelte
                          one entry per component. The groups are those of @scylla/ui:
                          primitives, controls, data-display, feedback, forms, layout
```

## Add an entry

1. Make `src/<group>/<Component>.stories.svelte`. Copy a neighbour.
2. Import the component from its entry point, `@scylla/ui` or `@scylla/ui/primitives`. Never
   from a path in `packages/ui/src`.
3. Write `defineMeta({ title: '<Group>/<Component>', component })`. Put the parts of a composed
   primitive in `subcomponents`.
4. Write one story for each axis: variants, sizes, states. Put each case in a `Specimen` with its
   name. `state="hover"` or `state="focus"` shows the case hovered or focused.
5. Run `pnpm ui:catalog`. Look at the entry in the light theme and in the dark theme.

## Rules that bite here

- **Each component has an entry.** `packages/ui/src/__test__/catalog.test.ts` fails when a
  component that `@scylla/ui` or `@scylla/ui/primitives` exports has no story that imports it
  from that entry point. A component is an export with a PascalCase name that is a function. A
  part that no story renders by itself (`DialogPortal`, `DialogOverlay`: `DialogContent` renders
  them) goes in the `subcomponents` of the meta.
- **A story with its own markup has `asChild`.** Without it, Svelte CSF gives the markup to the
  component of the meta as its `children`. A story that uses `args` renders them in
  `{#snippet template(args)}`.
- **No `msg` in a story.** The macro compiles in `.ts` files only. The text of a story is plain
  English. A validation message is a plain descriptor: `{ id, message }`.
- **Hover and focus come from the pseudo-states addon.** It copies each `:hover` and `:focus`
  rule of the page to a `pseudo-*-all` class, and `Specimen` puts this class on the case.
- **A floating part is open with its `open` prop** (a dialog, a menu, a tooltip, a select), so
  that the entry shows it without a click.
- **`.storybook/main.ts` puts the Svelte plugin before the plugins of Storybook**: the stories
  plugin of the addon reads the code that Svelte compiled. It also keeps the Svelte libraries out
  of the prebundle of the dev server: vite-plugin-svelte 7 prebundles them on Vite 8 only, as in
  `tooling/vite.ts`. A new Svelte library that a story imports goes in `SVELTE_LIBRARIES`.
- **The gates of the root do not read `catalog/`.** ESLint ignores it, and `tsc`, depcruise and
  Vitest do not include it. `svelte-check` and the build of the catalog check the stories:
  `pnpm ui:catalog:build`, and the step "Catalog of @scylla/ui" of CI.
- **The classes of a story go into the CSS of the catalog only.** `catalog.css` adds
  `@source '../src'`. `styles.css` does not scan `catalog/`, thus the app CSS does not get them.

## Left out

- **`Identity` and `IdentityAvatar`** (scylla-base, `shared/presentation/ui/data-display/`). No
  entry point exports them: `@scylla/base-sdk` exports the platform and the features of
  scylla-base, not `shared/`. A story needs a deep import, which `sdk-is-the-door` forbids. They
  have a business meaning (a person, an agent, an app), thus they do not go to `@scylla/ui`.
