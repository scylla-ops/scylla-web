# Design system: the code and Figma

> [`@scylla/ui`](./README.md) · [agent guide](./AGENTS.md)

## The rule

- The code is the source of truth. `@scylla/ui` holds the tokens (`src/styles.css`) and the
  components.
- The Figma library [scylla :: ui](https://www.figma.com/design/Soh2M4f7Xvsls7iGCWclSV/scylla-ui)
  follows the code. Do not change a token or a component in Figma first.
- The page [UI · référence (code)](https://www.figma.com/design/In9E3JWnOYIfcP5VEU1Jau/Scylla?node-id=1388-2269)
  of the design file shows the UI as the code draws it.

## The token files

`pnpm tokens:export` reads `src/styles.css` and the default theme of Tailwind. It writes the
files of `tokens/` in the format of the Design Tokens Community Group (DTCG). Do not edit them.

| File | Figma target |
|---|---|
| `mode.light.tokens.json` | collection `mode`, mode `light mode`: the colors and the radii |
| `mode.dark.tokens.json` | collection `mode`, mode `dark mode` |
| `font.tokens.json` | collection `tw/font`: `family/sans`, `family/display`, `family/mono` |
| `shadow.tokens.json` | the effect styles `shadow-*`. Figma cannot import them: set them by hand |

## Change a token

1. Edit `src/styles.css`: `:root` for the light mode, `.dark` for the dark mode, `@theme inline`
   for the radii and the fonts.
2. Run `pnpm tokens:export`.
3. Commit `styles.css` and `tokens/` together.
4. Update the Figma variables (see "Update Figma").
5. Publish the library.

## Update Figma

Use one of these methods:

- **By hand.** In the library, open the Variables window. In the collection `mode`, right-click
  `light mode` > **Import mode**, then select `mode.light.tokens.json`. Do the same for
  `dark mode` and for `tw/font`. Set the effect styles from `shadow.tokens.json`. Publish.
- **The design agent of the fleet.** It reads `tokens/` and sets the variables with the Figma
  MCP. Then it publishes the library.
- **The REST API.** `FIGMA_TOKEN=<token> pnpm tokens:export` compares the variables with the
  code. Add `--push` to write the changes. Only an Enterprise plan has this API: our plans do
  not have it.

An import replaces an alias with the value of the file. Keep a Figma token in your shell. Never
write it in a file of the repository.

## The catalog

The catalog (Storybook) shows each component of `@scylla/ui` with its variants, sizes and
states, in the light and the dark theme, with the tokens of `styles.css`. Compare the library
with it.

- Run it: `pnpm ui:catalog`, then open <http://localhost:6006>. The toolbar changes the theme
  and the language.
- Build it as CI does: `pnpm ui:catalog:build`.

Add an entry:

1. Make `catalog/src/<group>/<Component>.stories.svelte`. Copy a neighbour.
2. Import the component from `@scylla/ui` or `@scylla/ui/primitives`.
3. Write one story for each axis: variants, sizes, states. Put each case in a `Specimen` with
   its name. `state="hover"` or `state="focus"` shows the case hovered or focused.
4. Run `pnpm ui:catalog`. Look at the entry in the two themes.

The rules of the stories: [`catalog/AGENTS.md`](../../catalog/AGENTS.md).

## Add or change a component

1. Write the component in `@scylla/ui` first. Follow [`AGENTS.md`](./AGENTS.md).
2. Add or update its entry in `catalog/src/` (see "The catalog"). Look at it with
   `pnpm ui:catalog`.
3. Make or change the component in the library. Use only the variables of the library, never
   a raw value.
4. Connect the Figma component to its code with Code Connect: the Svelte file and its import
   from `@scylla/ui`. Then Dev Mode shows this code.
5. Publish the library.

## For a designer

- Use only the components and the variables of the library. Do not detach an instance.
- If a component is missing, ask for it in the code first. Mark a new design as a proposal.
- Dev Mode shows the code of each connected component. Give this code in a handoff.

## How the fleet does it

- A fix that changes `styles.css` runs `pnpm tokens:export` and commits `tokens/`.
- A fix that adds or changes a component of `@scylla/ui` adds or changes its catalog entry in
  the same commit.
- After a fix that changes `packages/ui`, the coordinator starts a design task. The design agent
  updates the library (variables, components, Code Connect), then publishes it.

## The checks

- `pnpm tokens:check` fails when `tokens/` is not the export of `styles.css`. The CI step
  "Design tokens" of `.github/workflows/frontend.yml` runs it.
- The test `scripts/__test__/design-tokens.test.mjs` does the same check in `pnpm test`.
- The test `src/__test__/catalog.test.ts` fails in `pnpm test` when a component of `@scylla/ui`
  or `@scylla/ui/primitives` has no entry in the catalog.
- The CI step "Catalog of @scylla/ui" type-checks and builds the catalog.
