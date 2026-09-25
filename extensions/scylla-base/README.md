# scylla-base

> [Scylla frontend](../../README.md) › `extensions/scylla-base` ·
> [agent guide](./AGENTS.md) · [architecture](../../docs/architecture.md)

The base extension: the Scylla frontend as users know it. Organizations, projects, pipelines,
jobs, triggers, agents, apps, secrets, roles, members — the 14 features — and the frame that
holds them together: the login gate, the organization selector, the release announcement.

The core does not know any of this. It loads this extension like any other; what makes it
"base" is only that the other extensions build on it, through
[`@scylla/base-sdk`](../../sdks/scylla-base-sdk/README.md).

## How it is built

Inside, it is the Clean Architecture that `CLAUDE.md` describes: `features/` depend on
`platform/` and `shared/`, reach each other through their `index.ts`, and keep their
`domain/` pure. Moving this code into an extension changed none of that — only where the
boundaries of the whole app are.

- [`shell/`](src/shell/README.md) — the list of features and the Scylla parts of the frame.
- [`platform/authz`](src/platform/authz/README.md), [`platform/context`](src/platform/context/README.md),
  [`platform/grpc`](src/platform/grpc/README.md) — the capabilities below the features.
- [`shared/`](src/shared/README.md) — what two features share and that has a business meaning.

## Why the frame is a module

The mounts, the sidebar sections and the shell parts are declared by `ShellModule`, a module
like the features, and not by the extension itself. The extension stays a short `@Extension`
declaration, and every piece of the frame sits next to the code it uses.
