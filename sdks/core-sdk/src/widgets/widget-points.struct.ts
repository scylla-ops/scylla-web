import type { MessageDescriptor } from '@lingui/core';
import type { Component } from 'svelte';
import type { Action } from 'svelte/action';
import type { RoutePermission } from '../extension/register.struct.ts';

export type ZonePosition = 'before' | 'after' | 'replace';

export interface ZoneComponentOptions<C> {
  /** Default: `after`. */
  position?: ZonePosition;
  /** Reactive: read in a `$derived`. */
  when?: (context: C) => boolean;
  /** Checked with the access policy of the app. The owner's route guard does not cover it. */
  permission?: RoutePermission;
  /** Write it `() => import('./X.svelte')`: the component keeps its own chunk. */
  component: () => Promise<{ default: Component<{ context: C }> }>;
}

/**
 * What every point has. A module lists its points in `ScyllaModule.points`: that is how the
 * loader finds a point's owner, and names it `<module id>.<key>` in the errors.
 */
export interface WidgetPoint {
  readonly kind: 'zone' | 'texts' | 'value';
}

/**
 * One item of a `WidgetInjection`: what `inject`, `override` or `patch` returns. Made by a method
 * of a point, never by hand, and never named outside this SDK.
 */
export interface WidgetInjectionItem {
  /** The point object itself: the registry is keyed by it. */
  readonly point: WidgetPoint;
  /** Internal payload: the options, the overrides, or the patch. Read by the loader only. */
  readonly payload: unknown;
}

/** The payload of a texts change: per message key, the original descriptor and its override. */
export type TextOverrides = Readonly<
  Record<string, { readonly original: MessageDescriptor; readonly override: MessageDescriptor }>
>;

/**
 * A place that receives components. The owner opens it with the point itself, as a Svelte
 * action: `<div use:loginPoints.footer={{ isPending }}>`.
 */
export interface ZonePoint<C> extends Action<HTMLElement, C>, WidgetPoint {
  readonly kind: 'zone';
  /** Contributor: put a component in this zone. */
  inject(options: ZoneComponentOptions<C>): WidgetInjectionItem;
}

/**
 * Messages that contributors can override. The owner keeps rendering them with
 * `t(myMessages.key)`: `t` applies the overrides.
 */
export interface TextsPoint<M extends Readonly<Record<string, MessageDescriptor>>>
  extends WidgetPoint {
  readonly kind: 'texts';
  /** Contributor: override some messages, with `msg` descriptors. */
  override(overrides: Partial<Record<keyof M, MessageDescriptor>>): WidgetInjectionItem;
}

/** A value that contributors can transform. */
export interface ValuePoint<T> extends WidgetPoint {
  readonly kind: 'value';
  /** Contributor: a pure function. It returns a new value and keeps the ids that the owner reads. */
  patch(patch: (value: T) => T): WidgetInjectionItem;
  /** Owner: the value after all the patches, in load order. */
  resolve(value: T): T;
}
