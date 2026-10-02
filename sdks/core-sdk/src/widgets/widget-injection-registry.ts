import type { MessageDescriptor } from '@lingui/core';
import { setMessageOverrides } from '@scylla/ui/i18n';
import type { RoutePermission } from '../extension/register.struct.ts';
import type { WidgetPoint, ZoneComponentOptions } from './widget-points.struct.ts';

/** One zone component, resolved and keyed. Internal: a point never exposes it. */
export interface RegisteredComponent<C = unknown> extends ZoneComponentOptions<C> {
  /** `<injectionId>#<index>`. Used by the zone action's keys and by the error messages. */
  readonly key: string;
}

/** One value patch, kept with the injection that made it, for the error messages. */
export interface RegisteredPatch<T = unknown> {
  readonly key: string;
  readonly patch: (value: T) => T;
}

/** Keyed by the point object: two points never collide, whatever their names. */
export interface WidgetInjectionRegistry {
  /** Zone point → its components, in load order. */
  readonly zones: ReadonlyMap<WidgetPoint, readonly RegisteredComponent[]>;
  /** Original message descriptor → its override. `t()` reads it. */
  readonly texts: ReadonlyMap<MessageDescriptor, MessageDescriptor>;
  /** Value point → its patches, in load order: a patch receives the result of the patch before it. */
  readonly values: ReadonlyMap<WidgetPoint, readonly RegisteredPatch[]>;
  /** Point → `<module id>.<key>`, from `ScyllaModule.points`. For the errors and `data-widget-zone`. */
  readonly names: ReadonlyMap<WidgetPoint, string>;
  /** The `can` of the access policy, for `permission`. */
  readonly can?: (permission: RoutePermission) => boolean;
}

let registry: WidgetInjectionRegistry | null = null;

/** The composition root installs it at start-up, next to `setDependencyRegistry`. */
export const setWidgetInjectionRegistry = (next: WidgetInjectionRegistry | null): void => {
  registry = next;
  setMessageOverrides(next?.texts ?? null);
};

/** Read by the zone action only. Returns `[]` with no registry installed. */
export const componentsOf = (zone: WidgetPoint): readonly RegisteredComponent[] =>
  registry?.zones.get(zone) ?? [];

/** Read by `ValuePoint` only. Returns `[]` with no registry installed. */
export const patchesOf = (value: WidgetPoint): readonly RegisteredPatch[] =>
  registry?.values.get(value) ?? [];

/** `<module id>.<key>`, or `undefined` for a point that no loaded module declares. */
export const nameOf = (point: WidgetPoint): string | undefined => registry?.names.get(point);

/** Read by `ZoneComponentOptions.permission` checks only. `undefined` with no registry installed. */
export const canForWidgets = (): ((permission: RoutePermission) => boolean) | undefined => registry?.can;
