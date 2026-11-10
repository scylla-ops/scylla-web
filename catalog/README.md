# The catalog of `@scylla/ui`

A page for each component of the design system, with all its variants, sizes and states, in the
light and the dark theme. Designers and developers compare it with the Figma library. The code is
the source of truth: when the two are different, the catalog shows what the app shows.

```sh
pnpm ui:catalog          # http://localhost:6006
pnpm ui:catalog:build    # type-check, then a static build in catalog/storybook-static/
```

The toolbar of Storybook changes the theme (Light, Dark) and the language (English, Français).
The components use the real tokens of `packages/ui/src/styles.css` and the real catalogs of
Lingui.

## Why it is built this way

- **Storybook, not Histoire.** Storybook 10 runs Svelte 5 with runes through Svelte CSF 5, on
  Vite 7, and it is stable. Histoire 1.0 is still a beta.
- **A folder at the root, not `apps/`.** A host repo (the Enterprise front) mounts this repo and
  includes its `packages/`, `sdks/` and `extensions/` in its workspace: Storybook must not get
  into it. The tests that read the source of `apps/` and `packages/` do not walk the
  `node_modules` of Storybook. The Tailwind of the app scans `apps/`, not `catalog/`.
- **The stories are not beside the components.** Beside them, ESLint, `svelte-check`, depcruise
  and the host would all read files that import Storybook. Here, the gates of the app stay as
  fast as before, and only the catalog checks its stories.
- **A test keeps the catalog complete.** `packages/ui/src/__test__/catalog.test.ts` reads the
  exports of `@scylla/ui` and `@scylla/ui/primitives`, and fails when a component has no entry.
  A new component cannot be forgotten.

How to add an entry, and the rules: [AGENTS.md](AGENTS.md).
