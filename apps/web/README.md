# `apps/web`

> [Scylla frontend](../../README.md) › `apps/web` · [agent guide](./AGENTS.md)

The Scylla web app as it ships: `@scylla/core` with the extensions of this build. Today that is
`scylla-base`. Another build (for example a SaaS one, in a private repo that mounts this one as
a submodule) lists its own extensions in its own app, and nothing else changes.

The conformance tests of the whole app live here, because this is the one place that knows
every extension: every page inside the shell declares a permission, and the breadcrumbs that
modules of different features compose read as one trail.
