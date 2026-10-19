# Changelog

All notable changes to Scylla Web are in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before 1.0.0, a new minor
version (0.6.0) can change what an extension imports; a patch version (0.5.1) only fixes bugs.
An entry marked **Breaking** changes what a host repo or an extension imports
(`@scylla/ui/*`, `@scylla/core-sdk`, `@scylla/base-sdk`).

## [Unreleased]

### Changed

- **Breaking:** Code that touches an element is an attachment (`{@attach}`), not a Svelte
  action. `renderCodeMirror` from `@scylla/ui` takes its options as a getter:
  `{@attach renderCodeMirror(() => ({ doc, extensions }))}`.
- **Breaking:** A widget zone opens with the `WidgetZone` component of `@scylla/core-sdk`, not an
  attachment: `<WidgetZone point={loginPoints.footer} context={{ isPending }} />`. The injected
  components render in the owner's tree, so they read its Svelte context. A `replace` does not
  mount the owner's content. A widget injection does not change.
- A repository calls its gRPC client directly. The data source layer between them is removed.

### Fixed

- The pipeline editor no longer freezes on a loop of dependencies. The blueprint refuses a link
  that closes a loop.

## [0.5.0] - 2026-10-12

### Added

- Account pages, with a password reset.
- The sessions and an identity card on the user pages.
- New agents pages. The access of an agent and the names of its secrets are configurable.
- Extension points on the members page, and a return path after the login.

### Changed

- **Breaking:** `@scylla/ui/shadcn` is now `@scylla/ui/primitives`, with one folder for each
  primitive.
- Each component is in a folder with its companions. Deep imports use the aliases.
- `CLAUDE.md` is now `AGENTS.md`. `CONTRIBUTING.md` explains how to contribute.
- The CI fails when a commit names an AI agent as its author or co-author.
- The protos pin is the one of Scylla 0.5.0.

### Removed

- The invitation permission.

### Fixed

- The JSON linting and the colors of the pipeline script editor.
- Menus take the focus when they open. The tooltip arrow is at the correct position. The
  sidebar collapses smoothly.
- The scroll content and the focus rings stay inside their containers.
- The user texts have no em dashes.
- Users with the manage role can see the extensions page.
- The tab title shows the version of the app. It said 0.4: the title now comes from the
  version of `apps/web/package.json`.

[Unreleased]: https://github.com/scylla-ops/scylla-web/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/scylla-ops/scylla-web/releases/tag/v0.5.0
