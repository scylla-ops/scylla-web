/**
 * Architecture rules of the workspace, as a machine check of the contract in
 * CLAUDE.md. Every rule below is a hard gate in CI; none of them is aspirational.
 *
 * Two levels:
 *  - *packages*  — `ui` is the bottom, `core-sdk` above it, then `core` and the
 *    extensions. The core never knows an extension; an extension reaches another
 *    one only through that extension's SDK. A package is reached only through the
 *    entry points of its `package.json`.
 *  - *modules*, inside `scylla-base` — who may depend on whom
 *    (`shared-is-generic`, `platform-knows-no-feature`, `domain-is-pure`, …) and
 *    through which door (`feature-api-only`, `platform-api-only`, …).
 *
 * `pnpm depcruise`       -> validate, human-readable
 * `pnpm depcruise:graph` -> SVG of the module graph (needs graphviz)
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    // ── Packages ────────────────────────────────────────────────────────────────

    {
      name: 'ui-is-generic',
      comment:
        '@scylla/ui is the design system: it could ship in another product unchanged. ' +
        'It depends on no other package of the workspace.',
      severity: 'error',
      from: { path: '^packages/ui/' },
      to: { path: '^(apps|packages/core|sdks|extensions)/' },
    },

    {
      name: 'core-sdk-is-the-contract',
      comment:
        '@scylla/core-sdk is what an extension compiles against. It may not depend on the ' +
        'core that implements it, nor on any extension.',
      severity: 'error',
      from: { path: '^sdks/core-sdk/' },
      to: { path: '^(apps|packages/core|extensions|sdks/(?!core-sdk/))' },
    },

    {
      name: 'core-knows-no-extension',
      comment:
        'The core loads extensions it has never heard of. The moment it imports one, that ' +
        'extension stops being optional.',
      severity: 'error',
      from: { path: '^packages/core/' },
      to: { path: '^(apps|extensions|sdks/(?!core-sdk/))' },
    },

    {
      name: 'extension-uses-sdks',
      comment:
        'An extension reaches another extension only through that extension\'s SDK, and ' +
        'the core only through @scylla/core-sdk. The app (`apps/web`) composes them.',
      severity: 'error',
      from: { path: '^extensions/([^/]+)/' },
      to: { path: ['^extensions/', '^packages/core/', '^apps/'], pathNot: '^extensions/$1/' },
    },

    {
      name: 'sdk-is-the-door',
      comment:
        'The internals of an extension are private. Its SDK re-exports what other ' +
        'extensions may use; only that SDK reaches the barrels behind it.',
      severity: 'error',
      from: { path: '^(apps|packages|sdks|extensions|test)/', pathNot: ['^extensions/scylla-base/', '^sdks/scylla-base-sdk/'] },
      to: { path: '^extensions/scylla-base/src/', pathNot: '^extensions/scylla-base/src/index[.]ts$' },
    },

    {
      name: 'package-api-only',
      comment:
        'A package is reached through the entry points of its `package.json` exports, ' +
        'never through a deep path: its other files stay free to move.',
      severity: 'error',
      from: { path: '^(apps|packages|sdks|extensions)/([^/]+)/|^test/' },
      to: {
        path: '^(packages|sdks)/[^/]+/src/',
        pathNot: [
          '^$1/$2/',
          '^packages/(core|ui)/src/index[.]ts$',
          '^sdks/[^/]+/src/index[.]ts$',
          '^packages/ui/src/(shadcn|state|stores|i18n|utils|structs)/index[.]ts$',
          '^packages/ui/src/styles[.]css$',
          '^packages/ui/src/assets/',
        ],
      },
    },

    // ── Modules of scylla-base ──────────────────────────────────────────────────

    {
      name: 'no-circular',
      comment:
        'A cycle means the two modules are really one. It also blocks route-level code ' +
        'splitting and makes the graph impossible to reason about.',
      severity: 'error',
      from: {},
      to: {
        circular: true,
        // A cycle that runs through a dynamic import is not a cycle at runtime —
        // it is a chunk boundary. Modules declare their pages with a `lazy`
        // import, so `x.module.ts -> (lazy) SomePage -> ... -> x.module.ts` is
        // expected and is precisely what makes the page a separate chunk. Only
        // flag cycles where every edge is static.
        viaOnly: { dependencyTypesNot: ['dynamic-import'] },
      },
    },

    {
      name: 'feature-api-only',
      comment:
        "A feature is reachable only through its `index.ts`. Reaching into another " +
        "feature's `domain/`, `presentation/` or `infrastructure/` makes every file in " +
        'it public, so no internal can be moved without breaking someone else — and it ' +
        'is how the module graph became a single strongly connected component before.',
      severity: 'error',
      from: { path: '^extensions/scylla-base/src/features/([^/]+)/' },
      to: {
        path: '^extensions/scylla-base/src/features/[^/]+/.+',
        pathNot: [
          // its own internals
          '^extensions/scylla-base/src/features/$1/',
          // another feature's public API
          '^extensions/scylla-base/src/features/[^/]+/index[.]ts$',
        ],
      },
    },

    {
      name: 'shell-uses-feature-api',
      comment:
        'The shell composes features, so it may import them — but through the same public ' +
        'API everyone else uses. The one extra door is `<feature>.module.ts`, which the ' +
        'registry imports on purpose (see `module-declaration-is-private`).',
      severity: 'error',
      from: { path: '^extensions/scylla-base/src/shell/' },
      to: {
        path: '^extensions/scylla-base/src/features/[^/]+/.+',
        pathNot: [
          '^extensions/scylla-base/src/features/[^/]+/index[.]ts$',
          '^extensions/scylla-base/src/features/[^/]+/[^/]+[.]module[.]ts$',
        ],
      },
    },

    {
      name: 'platform-api-only',
      comment:
        'Same contract as features, for the capabilities below them: import `@platform/authz`, ' +
        'not `@platform/authz/presentation/stores/…`.',
      severity: 'error',
      from: { path: '^extensions/scylla-base/src/(features|shell)/' },
      to: {
        path: '^extensions/scylla-base/src/platform/[^/]+/.+',
        pathNot: '^extensions/scylla-base/src/platform/[^/]+/index[.]ts$',
      },
    },

    {
      name: 'platform-capability-api-only',
      comment:
        'Platform capabilities are modules too: `routing` reaches `authz` through its ' +
        'public API, not through its internals.',
      severity: 'error',
      from: { path: '^extensions/scylla-base/src/platform/([^/]+)/' },
      to: {
        path: '^extensions/scylla-base/src/platform/[^/]+/.+',
        pathNot: ['^extensions/scylla-base/src/platform/$1/', '^extensions/scylla-base/src/platform/[^/]+/index[.]ts$'],
      },
    },

    {
      name: 'module-declaration-is-private',
      comment:
        '`<feature>.module.ts` instantiates the module\'s infrastructure at import time, so ' +
        'importing it eagerly pulls that feature\'s gRPC client into your chunk. Only the ' +
        'module list (`shell/modules.ts`) and the feature itself may.',
      severity: 'error',
      from: { path: '^extensions/scylla-base/src/features/([^/]+)/' },
      to: {
        path: '^extensions/scylla-base/src/features/[^/]+/[^/]+[.]module[.]ts$',
        pathNot: '^extensions/scylla-base/src/features/$1/',
      },
    },

    {
      name: 'domain-accessor-is-private',
      comment:
        '`use-<feature>-domain.ts` is where a feature pins the type of its own injection. ' +
        'Another module calling it would query that feature\'s repository directly — ' +
        'bypassing its hooks and forking the query cache into two keys for one resource. ' +
        'Consume the feature\'s hooks through its `index.ts` instead.',
      severity: 'error',
      from: { path: '^extensions/scylla-base/src/features/([^/]+)/' },
      to: {
        path: '^extensions/scylla-base/src/features/[^/]+/presentation/hooks/use-[^/]+-domain[.]ts$',
        pathNot: '^extensions/scylla-base/src/features/$1/',
      },
    },

    {
      name: 'shared-is-generic',
      comment:
        'shared/ holds reusable UI and utils with no business meaning. The moment it ' +
        'knows about a feature it stops being reusable and becomes a cycle.',
      severity: 'error',
      from: { path: '^extensions/scylla-base/src/shared/' },
      to: { path: '^extensions/scylla-base/src/(features|shell|platform)/' },
    },

    {
      name: 'platform-knows-no-feature',
      comment:
        'platform/ sits below features so every feature can depend on it. It may never ' +
        'depend back on one.',
      severity: 'error',
      from: { path: '^extensions/scylla-base/src/platform/' },
      to: { path: '^extensions/scylla-base/src/(features|shell)/' },
    },

    {
      name: 'domain-is-pure',
      comment:
        'domain/ is pure business logic: no UI framework, no gRPC, no generated proto, no ' +
        'query/state library. Framework types belong in infrastructure or presentation.',
      severity: 'error',
      from: { path: '/domain/' },
      to: {
        path: [
          '^extensions/scylla-base/src/generated/',
          '^node_modules/(svelte|bits-ui|@tanstack|@lingui|@protobuf-ts|@lucide)',
          // Of the other packages, only the plain data shapes of @scylla/ui.
          '^(packages|sdks)/',
        ],
        pathNot: '^packages/ui/src/structs/',
      },
    },

    {
      name: 'domain-does-not-know-infrastructure',
      comment:
        'The dependency inversion the layering exists for: domain declares repository ' +
        'interfaces, infrastructure implements them, never the reverse.',
      severity: 'error',
      from: { path: '/domain/' },
      to: { path: '/src/.+/infrastructure/' },
    },

    {
      name: 'no-feature-imports-the-shell',
      comment:
        'The shell (`shell/`) composes features. A feature reaching ' +
        'back into it inverts the composition root.',
      severity: 'error',
      from: { path: '^extensions/scylla-base/src/features/' },
      to: { path: '^extensions/scylla-base/src/shell/' },
    },

    {
      name: 'not-to-dev-dep',
      comment: 'Shipped code must not import a devDependency.',
      severity: 'error',
      // `.d.ts` files are excluded: vite-env.d.ts legitimately references
      // vite/client, which is types-only and never reaches the bundle. So are
      // the tests and `test/`, the suite's own harness, which never ship.
      from: {
        path: '^(apps|packages|sdks|extensions)/',
        pathNot: ['[.](spec|test)[.]ts$', '[.]fixture[.](ts|svelte)$', '/__test__/', '[.]d[.]ts$', '^test/'],
      },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'] },
    },

    {
      name: 'no-orphans',
      comment:
        'A module nothing imports is usually dead code left behind by a refactor. ' +
        'Config, type declarations and entry points are excluded.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)[.][^/]+[.](js|cjs|mjs|ts|json)$',
          '[.]d[.]ts$',
          '(^|/)tsconfig[.]json$',
          '(^|/)(vite|eslint|lingui|postcss)[.]config[.][^/]+$',
          '^apps/web/src/main[.]ts$',
          '^extensions/scylla-base/src/generated/',
          '^packages/ui/src/styles[.]css$',
          // Vitest loads setup.ts by path from the config, and the render
          // helpers are only imported by test files, which are themselves
          // orphans — neither is reachable from the module graph.
          '^test/',
        ],
      },
      to: {},
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },

    // Generated proto clients and compiled Lingui catalogs are machine output —
    // they have their own shape and are not ours to police.
    exclude: { path: ['^extensions/scylla-base/src/generated/', '/locales/'] },

    // Resolves the @base/ @platform/ @shared/ @test/ aliases the codebase imports by.
    tsConfig: { fileName: 'tsconfig.app.json' },

    // Follow type-only imports too: `import type { UserEntity }` across a module
    // boundary is still a coupling, and still a cycle.
    tsPreCompilationDeps: true,

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },

    reporterOptions: {
      dot: { collapsePattern: '^(extensions/[^/]+/src/(features/[^/]+|[^/]+)|(apps|packages|sdks)/[^/]+)' },
      archi: { collapsePattern: '^(extensions/[^/]+/src/(features/[^/]+|[^/]+)|(apps|packages|sdks)/[^/]+)' },
      text: { highlightFocused: true },
    },
  },
};
