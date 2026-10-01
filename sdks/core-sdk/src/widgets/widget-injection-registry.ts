import type { RoutePermission } from '../extension/register.struct.ts';
import type { ZoneComponentOptions } from './widget-points.struct.ts';

/** One zone component, resolved and keyed. Internal: a point never exposes it. */
export interface RegisteredComponent<C = unknown> extends ZoneComponentOptions<C> {
  /** `<injectionId>#<index>`. Used by `widgetZone`'s Svelte keys and by the error messages. */
  readonly key: string;
}

/** One value patch, kept with the injection that made it, for the error messages. */
export interface RegisteredPatch<T = unknown> {
  readonly key: string;
  readonly patch: (value: T) => T;
}

export interface WidgetInjectionRegistry {
  /** Point name → its components, sorted by `order`, then by load order. */
  readonly zones: Readonly<Record<string, readonly RegisteredComponent[]>>;
  /** Text scope → overridden keys → their message (a descriptor, or a function). */
  readonly texts: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Point name → its patches, in load order: a patch receives the result of the patch before it. */
  readonly values: Readonly<Record<string, readonly RegisteredPatch[]>>;
  /** The `can` of the access policy, for `permission`. */
  readonly can?: (permission: RoutePermission) => boolean;
}

let registry: WidgetInjectionRegistry | null = null;

/** The composition root installs it at start-up, next to `setDependencyRegistry`. */
export const setWidgetInjectionRegistry = (next: WidgetInjectionRegistry | null): void => {
  registry = next;
};

/** Read by `ZonePoint` and `widgetZone` only. Returns `[]` with no registry installed. */
export const componentsOf = (zone: string): readonly RegisteredComponent[] =>
  registry?.zones[zone] ?? [];

/** Read by `TextsPoint` only. Returns `{}` with no registry installed. */
export const textOverridesOf = (scope: string): Readonly<Record<string, unknown>> =>
  registry?.texts[scope] ?? {};

/** Read by `ValuePoint` only. Returns `[]` with no registry installed. */
export const patchesOf = (value: string): readonly RegisteredPatch[] => registry?.values[value] ?? [];

/** Read by `ZoneComponentOptions.permission` checks only. `undefined` with no registry installed. */
export const canForWidgets = (): ((permission: RoutePermission) => boolean) | undefined => registry?.can;
