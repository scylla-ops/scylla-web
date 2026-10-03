import { buildWidgetInjectionRegistry } from './build-widget-injection-registry.ts';
import type { WidgetInjection } from './widget-injection.struct.ts';
import { setWidgetInjectionRegistry } from './widget-injection-registry.ts';

/**
 * Installs these injections, with the same registry and conflict checks as the app, but no
 * owner or dependency check — only `loadExtensions` runs those, because they need the whole
 * app's extensions and modules. Use it to test one extension's own injections: render its
 * components, read its overridden texts and patched values, with no other extension loaded.
 * Each key names an injection, as in `@Extension`. Restore with
 * `setWidgetInjectionRegistry(null)`.
 *
 * A community extension outside this monorepo has no access to `test/render.svelte.ts`
 * (`@test/*`, internal to this workspace — see `widgets_plan.md` §4.2): this is what it tests
 * against instead.
 */
export const installWidgetInjectionsForTest = (
  injections: Readonly<Record<string, WidgetInjection>>,
): void => {
  setWidgetInjectionRegistry(
    buildWidgetInjectionRegistry(
      Object.entries(injections).map(([id, changes]) => ({ id, changes })),
    ),
  );
};
