# `apps/web`

> [Scylla frontend](../../README.md) › `apps/web` · [agent guide](./AGENTS.md)

The Scylla web app as it ships: `@scylla/core` with the extensions of this build. Today that is
`scylla-base`; a SaaS build adds `scylla-cloud` to `src/extensions.ts`, and nothing else
changes.

The conformance tests of the whole app live here, because this is the one place that knows
every extension: every page inside the shell declares a permission, and the breadcrumbs that
modules of different features compose read as one trail.
