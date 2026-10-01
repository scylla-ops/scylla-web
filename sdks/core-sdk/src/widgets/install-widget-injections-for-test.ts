import type { WidgetInjection } from './widget-injection.struct.ts';
import {
  setWidgetInjectionRegistry,
  type RegisteredComponent,
  type RegisteredPatch,
} from './widget-injection-registry.ts';
import type { ZoneComponentOptions } from './widget-points.struct.ts';

/**
 * Installs these injections with no owner or conflict check — only `loadExtensions` runs those,
 * because they need the whole app's extensions and modules. Use it to test one extension's own
 * injections: render its components, read its overridden texts and patched values, with no
 * other extension loaded. Restore with `setWidgetInjectionRegistry(null)`.
 *
 * A community extension outside this monorepo has no access to `test/render.svelte.ts`
 * (`@test/*`, internal to this workspace — see `widgets_plan.md` §4.2): this is what it tests
 * against instead. The in-repo `withWidgetInjections` is the stricter tool, built on the same
 * merge `loadExtensions` runs, and stays in `test/render.svelte.ts`.
 */
export const installWidgetInjectionsForTest = (...injections: readonly WidgetInjection[]): void => {
  const zones: Record<string, RegisteredComponent[]> = {};
  const texts: Record<string, Record<string, unknown>> = {};
  const values: Record<string, RegisteredPatch[]> = {};

  for (const injection of injections) {
    injection.changes.forEach((change, changeIndex) => {
      const key = `${injection.id}#${changeIndex}`;
      switch (change.kind) {
        case 'zone':
          (zones[change.point] ??= []).push({
            ...(change.payload as ZoneComponentOptions<unknown>),
            key,
          });
          break;
        case 'texts':
          Object.assign((texts[change.point] ??= {}), change.payload as Record<string, unknown>);
          break;
        case 'value':
          (values[change.point] ??= []).push({
            key,
            patch: change.payload as (value: unknown) => unknown,
          });
          break;
      }
    });
  }

  for (const components of Object.values(zones)) {
    components.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  setWidgetInjectionRegistry({ zones, texts, values });
};
