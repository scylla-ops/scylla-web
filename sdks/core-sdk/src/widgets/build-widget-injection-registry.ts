import type { MessageDescriptor } from '@lingui/core';
import type { RoutePermission } from '../extension/register.struct.ts';
import type { WidgetInjection } from './widget-injection.struct.ts';
import type {
  RegisteredComponent,
  RegisteredPatch,
  WidgetInjectionRegistry,
} from './widget-injection-registry.ts';
import type { TextOverrides, WidgetPoint, ZoneComponentOptions } from './widget-points.struct.ts';

/** An injection with the name that the errors and the component keys use. */
export interface NamedWidgetInjection {
  readonly id: string;
  readonly changes: WidgetInjection;
}

export interface WidgetInjectionRegistryOptions {
  /** Point → `<module id>.<key>`. Without it, the errors show the point as `?`. */
  readonly names?: ReadonlyMap<WidgetPoint, string>;
  readonly can?: (permission: RoutePermission) => boolean;
}

/**
 * The one place that turns injections into a registry, for the loader and for the tests alike.
 * The order is the order of `injections`, then of each injection's items (`widgets_plan.md`
 * §8.1): a zone shows its components in that order. An owner that lets contributors place
 * items among its own (a row of buttons) opens a value point — a list with ids — not a zone.
 * Throws when two injections replace one zone or override one message: those cannot both apply.
 * It does not check owners or dependencies — that needs the extensions, so the loader
 * (`mergeWidgetInjections`) does it before it calls this.
 */
export const buildWidgetInjectionRegistry = (
  injections: readonly NamedWidgetInjection[],
  { names = new Map(), can }: WidgetInjectionRegistryOptions = {},
): WidgetInjectionRegistry => {
  const zones = new Map<WidgetPoint, RegisteredComponent[]>();
  const texts = new Map<MessageDescriptor, MessageDescriptor>();
  const values = new Map<WidgetPoint, RegisteredPatch[]>();
  const replacedBy = new Map<WidgetPoint, string>();
  const overriddenBy = new Map<MessageDescriptor, string>();

  const listOf = <T>(map: Map<WidgetPoint, T[]>, point: WidgetPoint): T[] => {
    let list = map.get(point);
    if (!list) map.set(point, (list = []));
    return list;
  };

  for (const { id, changes } of injections) {
    changes.forEach(({ point, payload }, index) => {
      const key = `${id}#${index}`;

      if (point.kind === 'zone') {
        const options = payload as ZoneComponentOptions<unknown>;
        if (options.position === 'replace') {
          const existing = replacedBy.get(point);
          if (existing) {
            throw new Error(
              `Only one injection may replace the zone "${names.get(point) ?? '?'}": ` +
                `${existing}, ${id}.`,
            );
          }
          replacedBy.set(point, id);
        }
        listOf(zones, point).push({ ...options, key });
        return;
      }

      if (point.kind === 'texts') {
        for (const [messageKey, { original, override }] of Object.entries(
          payload as TextOverrides,
        )) {
          // By the descriptor: one message opened by two points is still one text.
          const existing = overriddenBy.get(original);
          if (existing) {
            throw new Error(
              `Two injections override the text "${names.get(point) ?? '?'}.${messageKey}": ` +
                `${existing}, ${id}.`,
            );
          }
          overriddenBy.set(original, id);
          texts.set(original, override);
        }
        return;
      }

      listOf(values, point).push({ key, patch: payload as (value: unknown) => unknown });
    });
  }

  return { zones, texts, values, names, can };
};
