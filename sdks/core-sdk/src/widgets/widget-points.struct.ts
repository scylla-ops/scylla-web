import type { Component } from 'svelte';
import type { RoutePermission } from '../extension/register.struct.ts';

export type ZonePosition = 'before' | 'after' | 'replace';

export interface ZoneComponentOptions<C> {
  /** Default: `after`. */
  position?: ZonePosition;
  /** Lower first. Default: 0. Equal orders keep the load order of the extensions. */
  order?: number;
  /** Reactive: read in a `$derived`. */
  when?: (context: C) => boolean;
  /** Checked with the access policy of the app. The owner's route guard does not cover it. */
  permission?: RoutePermission;
  /** Write it `() => import('./X.svelte')`: the component keeps its own chunk. */
  component: () => Promise<{ default: Component<{ context: C }> }>;
}

/** One item of an injection. Made by a method of a point, never by hand. */
export interface WidgetChange {
  readonly point: string;
  readonly kind: 'zone' | 'texts' | 'value';
  /** Internal payload: the options, the overrides, or the patch. Read by the loader only. */
  readonly payload: unknown;
}

/**
 * The parameter of `use:widgetZone`, built by `ZonePoint.with`. Opaque to a contributor: only
 * `widgetZone` reads it. `zone` is the point's `name`.
 */
export interface ZoneBinding<C = unknown> {
  readonly zone: string;
  readonly context: C;
}

/** A place that receives components. */
export interface ZonePoint<C> {
  /** `login.form`: the scope and the key. In the errors, the registry and `data-widget-zone`. */
  readonly name: string;
  /** Contributor: put a component in this zone. */
  inject(options: ZoneComponentOptions<C>): WidgetChange;
  /** Owner: the parameter of `use:widgetZone`. */
  with(context: C): ZoneBinding<C>;
  /**
   * Owner: `true` when an injection replaces this zone **and** would actually render for this
   * context — its `when` is evaluated too. A `replace` whose `when` is false must not hide the
   * default content: nothing would show.
   */
  hasReplacement(context: C): boolean;
}

/** Messages that contributors can override. `M` is the type of a `*.messages.ts` object. */
export interface TextsPoint<M> {
  readonly name: string;
  /** Contributor: override some messages. Each override has the type of the original message. */
  override(overrides: Partial<M>): WidgetChange;
  /** Owner: the messages, with the overrides. Render them with `t()`, as today. */
  readonly messages: M;
}

/** A value that contributors can transform. */
export interface ValuePoint<T> {
  readonly name: string;
  /** Contributor: a pure function. It returns a new value and keeps the ids that the owner reads. */
  patch(patch: (value: T) => T): WidgetChange;
  /** Owner: the value after all the patches, in load order. */
  resolve(value: T): T;
}
