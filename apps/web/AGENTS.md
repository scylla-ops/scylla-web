# `apps/web` — agent guide

The product build: the list of extensions, `main.ts`, `index.html` and `public/`. Vite builds
it (`root: apps/web` in `vite.config.ts`) into `dist/` at the repository root.

**Package** `apps/web` (`@scylla/web`)

## Layout

```
index.html  public/
src/
  main.ts                         imports @scylla/ui/styles.css, calls startCore
  extensions.ts                   THE list of extension classes of this build
  __test__/module-permissions.test.ts   every page in the shell declares a permission
  __test__/breadcrumb-trail.test.ts     the crumbs that the modules compose
```

## Rules that bite here

- **Adding an extension** = its package in `package.json` and its class in `extensions.ts`.
  The core orders them by their `dependencies`.
- `module-permissions.test.ts` enumerates the compiled routes of **all** loaded extensions.
  A page that genuinely needs no permission goes in `UNGATED_PAGES` **with the reason** — a
  ratchet: entries leave, a stale entry fails the suite.
- The app imports `@scylla/core`, the extension roots, and SDKs — never an extension's
  internals (`sdk-is-the-door`).
