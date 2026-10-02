import {
  buildWidgetInjectionRegistry,
  type AccessPolicy,
  type ExtensionManifest,
  type WidgetInjectionRegistry,
  type WidgetPoint,
} from '@scylla/core-sdk';

interface PointOwner {
  /** `<module id>.<key>`. */
  readonly name: string;
  readonly extensionId: string;
}

/**
 * Merges the `widgetInjections` of every extension into one registry, in the order
 * `widgets_plan.md` §8.1 fixes: extension load order, then the extension's own key order, then
 * the order of each injection's changes. An injection is named `<extension id>/<key>`: unique by
 * construction, since extension ids are. A point's owner is the module that lists it in
 * `points`. Throws on the first thing that cannot work — a point no loaded module lists, a
 * missing dependency, or (in `buildWidgetInjectionRegistry`) two replacements of one zone, two
 * overrides of one text — so a mistake fails at start-up and in the tests, never silently on
 * the page.
 */
export const mergeWidgetInjections = (
  extensions: readonly ExtensionManifest[],
  can?: AccessPolicy['can'],
): WidgetInjectionRegistry => {
  const owners = new Map<WidgetPoint, PointOwner>();
  for (const extension of extensions) {
    for (const module of extension.modules) {
      for (const [key, point] of Object.entries(module.points ?? {})) {
        const name = `${module.id}.${key}`;
        const existing = owners.get(point);
        if (existing) {
          throw new Error(`The point "${name}" is also listed as "${existing.name}".`);
        }
        owners.set(point, { name, extensionId: extension.id });
      }
    }
  }

  const injections = extensions.flatMap(extension =>
    Object.entries(extension.widgetInjections ?? {}).map(([key, changes]) => {
      const id = `${extension.id}/${key}`;

      for (const { point } of changes) {
        const owner = owners.get(point);
        if (!owner) {
          throw new Error(
            `The injection "${id}" changes a point that no loaded module lists in its \`points\`.`,
          );
        }
        if (
          owner.extensionId !== extension.id &&
          !(extension.dependencies ?? []).includes(owner.extensionId)
        ) {
          throw new Error(
            `The injection "${id}" changes "${owner.name}" of ${owner.extensionId}: ` +
              `add "${owner.extensionId}" to the dependencies of ${extension.id}.`,
          );
        }
      }

      return { id, changes };
    }),
  );

  const names = new Map([...owners].map(([point, owner]) => [point, owner.name]));
  return buildWidgetInjectionRegistry(injections, { names, can });
};
