import type {
  AccessPolicy,
  ExtensionManifest,
  RegisteredComponent,
  RegisteredPatch,
  WidgetInjectionRegistry,
  ZoneComponentOptions,
} from '@scylla/core-sdk';

interface OwnedChange {
  readonly injectionId: string;
  readonly extensionId: string;
  /** `<injectionId>#<index>`. */
  readonly key: string;
  readonly point: string;
  readonly kind: 'zone' | 'texts' | 'value';
  readonly payload: unknown;
}

const named = (injectionId: string, extensionId: string): string => `${injectionId} (${extensionId})`;

/**
 * Merges the `widgetInjections` of every extension into one registry, in the order
 * `widgets_plan.md` §8.1 fixes: extension load order, then the extension's own list order, then
 * the order of each injection's `changes`. Throws on the first thing that cannot work — an
 * unknown point, a missing dependency, two replacements of one zone, two overrides of one text —
 * so a mistake fails at start-up and in the tests, never silently on the page.
 */
export const mergeWidgetInjections = (
  extensions: readonly ExtensionManifest[],
  can?: AccessPolicy['can'],
): WidgetInjectionRegistry => {
  const moduleOwner = new Map<string, string>();
  for (const extension of extensions) {
    for (const module of extension.modules) {
      moduleOwner.set(module.id, extension.id);
    }
  }

  const injectionIds = new Set<string>();
  const changes: OwnedChange[] = [];

  for (const extension of extensions) {
    for (const injection of extension.widgetInjections ?? []) {
      if (injectionIds.has(injection.id)) {
        throw new Error(`Two widget injections have the id "${injection.id}".`);
      }
      injectionIds.add(injection.id);

      injection.changes.forEach((change, index) => {
        const scope = change.point.split('.', 1)[0] ?? change.point;
        const ownerExtensionId = moduleOwner.get(scope);

        if (ownerExtensionId === undefined) {
          throw new Error(
            `The injection "${injection.id}" (${extension.id}) changes "${change.point}", ` +
              `but no loaded module has the id "${scope}".`,
          );
        }
        if (
          ownerExtensionId !== extension.id &&
          !(extension.dependencies ?? []).includes(ownerExtensionId)
        ) {
          throw new Error(
            `The injection "${injection.id}" (${extension.id}) changes "${change.point}" of ` +
              `${ownerExtensionId}: add "${ownerExtensionId}" to the dependencies of ${extension.id}.`,
          );
        }

        changes.push({
          injectionId: injection.id,
          extensionId: extension.id,
          key: `${injection.id}#${index}`,
          point: change.point,
          kind: change.kind,
          payload: change.payload,
        });
      });
    }
  }

  const zones: Record<string, RegisteredComponent[]> = {};
  const texts: Record<string, Record<string, unknown>> = {};
  const values: Record<string, RegisteredPatch[]> = {};
  const replacedBy = new Map<string, OwnedChange>();
  const textOverrideOwner = new Map<string, OwnedChange>();

  for (const change of changes) {
    if (change.kind === 'zone') {
      const options = change.payload as ZoneComponentOptions<unknown>;
      if ((options.position ?? 'after') === 'replace') {
        const existing = replacedBy.get(change.point);
        if (existing) {
          throw new Error(
            `Only one injection may replace the zone "${change.point}": ` +
              `${named(existing.injectionId, existing.extensionId)}, ` +
              `${named(change.injectionId, change.extensionId)}.`,
          );
        }
        replacedBy.set(change.point, change);
      }
      (zones[change.point] ??= []).push({ ...options, key: change.key });
      continue;
    }

    if (change.kind === 'texts') {
      const overrides = change.payload as Record<string, unknown>;
      const scopeTexts = (texts[change.point] ??= {});
      for (const messageKey of Object.keys(overrides)) {
        const conflictKey = `${change.point}\u0000${messageKey}`;
        const existing = textOverrideOwner.get(conflictKey);
        if (existing) {
          throw new Error(
            `Two injections override the text "${change.point}.${messageKey}": ` +
              `${named(existing.injectionId, existing.extensionId)}, ` +
              `${named(change.injectionId, change.extensionId)}.`,
          );
        }
        textOverrideOwner.set(conflictKey, change);
        scopeTexts[messageKey] = overrides[messageKey];
      }
      continue;
    }

    (values[change.point] ??= []).push({
      key: change.key,
      patch: change.payload as (value: unknown) => unknown,
    });
  }

  // `Array.prototype.sort` is a stable sort (ES2019+): equal `order` values keep the order the
  // changes were collected in above — extension, then injection, then change.
  for (const components of Object.values(zones)) {
    components.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  return { zones, texts, values, can };
};
