# Contributing to Scylla Web

Thank you for your interest in Scylla. This page tells you how to set up the project, how we
work with branches, commits and pull requests, and what a change must pass before we merge it.

The rules of the code itself (layers, naming, Svelte, tests, i18n) are in
[`AGENTS.md`](AGENTS.md). Each package and each module also has its own `README.md` (why it is
built that way) and `AGENTS.md` (its public API and its rules). Read them before you change a
module.

## Set up the project

You need:

- [Node.js](https://nodejs.org/) 22 (the version of the CI)
- [pnpm](https://pnpm.io/) 11 — `corepack enable` installs the version of `packageManager` in
  `package.json`
- Optional: `protoc`, the Protocol Buffers compiler (`brew install protobuf`, or
  `protobuf-compiler` on Debian and Ubuntu). Without it, `pnpm gen-proto` downloads one.
- The Scylla backend, for a dev server that does something (see the [README](README.md))

```bash
git clone --recurse-submodules https://github.com/scylla-ops/scylla-web.git
cd scylla-web
cp .env.example .env
pnpm install
pnpm dev
```

The `.proto` files come from the `protos/` submodule. If you cloned without
`--recurse-submodules`, run `git submodule update --init`. Run all commands from the repository
root.

## Branches

- `main` holds the released versions.
- A **version branch** (`v0.6.0`, …) collects the work of the next version. It merges into
  `main` when the version is released.
- Start your work from the current version branch, on a branch named after the type of the
  change:

  | Prefix | Use |
  |---|---|
  | `feat/` | a new feature |
  | `fix/` | a bug fix |
  | `refactor/` | a change of structure, with no change of behavior |
  | `docs/` | documentation only |
  | `test/` | tests only |
  | `chore/` | tooling, dependencies, CI |

  Example: `fix/organization-selector-width`.

- Open the pull request against the version branch, not against `main`.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <summary>

<optional body: why the change is necessary>
```

- `type` is one of `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.
- `scope` is the package or the module, when it helps: `fix(pipeline): …`, `refactor(ui): …`.
- Write the summary in the imperative and in lowercase: `fix: resolve the me user id on the
  user settings page`.
- One commit = one logical change. Do not mix a refactor and a fix in one commit.
- Do not commit generated code (`src/generated/`, the compiled `messages.ts` of the catalogs).

## AI tools

You can use AI tools to write code, tests or documentation. The rules are the same as for any
other change:

- **You are the author.** You read, understand and test all of the change before you open the
  pull request. You answer the questions of the review.
- **Only humans are authors and co-authors.** Do not add a `Co-Authored-By` trailer that names
  an AI agent, and do not add a "Generated with …" line to a pull request. Configure your agent
  to not add them. The CI checks it: `pnpm check:authors origin/v0.6.0..HEAD` runs the same
  check on your branch.
- Agents read [`AGENTS.md`](AGENTS.md) and the `AGENTS.md` of each module. When you change a
  rule or a public API, update these files in the same pull request.

## Pull requests

- **One subject per pull request.** A small pull request gets a fast review.
- **The description** has a `Summary` (what changes and why) and a `Checks` list (the commands
  below and their result). Write it in
  [ASD-STE100](https://www.asd-ste100.org/) (Simplified Technical English): short sentences,
  one instruction per sentence. Issues, comments and `AGENTS.md` files use it too.
- **Show the UI.** For a visible change, add a screenshot or a short recording.
- **Keep the docs current.** A change of a public API, of the routes, of the permissions or of
  the structure of a module updates its `AGENTS.md`, and its `README.md` when the reasoning
  changes.
- **Breaking changes.** Say so in the description when you change what an extension imports
  (`@scylla/ui/*`, `@scylla/core-sdk`, `@scylla/base-sdk`). A host repo must then update.

## Checks

The CI runs these commands on each pull request. Run them before you push. All of them must
pass with zero warnings, zero failures, zero violations, zero cycles and zero collisions.

| Command | What it checks |
|---|---|
| `pnpm typecheck` | TypeScript, `.svelte` files included |
| `pnpm test` (`pnpm coverage` in CI) | The Vitest suite, and the coverage thresholds |
| `pnpm lint` | ESLint, warnings are errors. It is slow (about 20 minutes) |
| `pnpm depcruise` | The architecture: layer direction and public APIs |
| `pnpm depcruise:cycles` | No dependency cycle between modules |
| `pnpm i18n:collisions` | No message translated in two different ways |
| `pnpm check:authors <range>` | No AI agent as author, committer or co-author of a commit |

## Code conventions, in short

The full rules are in [`AGENTS.md`](AGENTS.md). The ones that a review asks for most often:

- **Architecture.** A module is reached only through its `index.ts`. Dependencies point down:
  `shell → features → platform → shared` in scylla-base, `presentation → domain ←
  infrastructure` in a feature.
- **Svelte 5, runes only.** Server state lives in TanStack Query, never in a store. Use
  `$derived` before `$effect`. Logic goes in a ViewModel (`*.state.svelte.ts`), not in a
  `.svelte` file.
- **Files.** kebab-case for files and folders, PascalCase for Svelte components. A component
  with a test, a private sub-component or a file of its own gets a folder named after it.
- **Imports.** In scylla-base, use the `@base/`, `@platform/` and `@shared/` aliases above one
  level of `../`.
- **i18n.** Every text goes in a `*.messages.ts` with `` msg`…` ``, never in a `.svelte` file.
  Give the French translation too (`locales/fr/messages.po`), with straight apostrophes (`'`).
  Run `pnpm extract` and `pnpm compile`.
- **Tests.** Query by role and accessible name. Inject fake repositories through the DI registry.
  No snapshots. Name a test after the rule it pins.
- **Comments.** Few and short, only where the code cannot speak for itself.
- **Formatting.** Prettier: single quotes, semicolons, 2 spaces, trailing commas, 100 columns.

## Report a bug or ask for a feature

Open an issue. For a bug, give the steps to reproduce it, what you expected, what happened, and
your browser. For a feature, tell the problem it solves before the solution.
