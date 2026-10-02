import type { MessageDescriptor } from '@lingui/core';
import { patchesOf } from './widget-injection-registry.ts';
import { reportWidgetInjectionError } from './report-widget-injection-error.ts';
import { mountZone } from './widget-zone.actions.svelte.ts';
import type {
  TextOverrides,
  TextsPoint,
  ValuePoint,
  ZoneComponentOptions,
  ZonePoint,
} from './widget-points.struct.ts';

type Messages = Readonly<Record<string, MessageDescriptor>>;

const zone = <C>(): ZonePoint<C> => {
  // The point is the action itself: `use:loginPoints.footer={context}`.
  const point: ZonePoint<C> = Object.assign(
    (node: HTMLElement, context?: C) => mountZone(node, point, context),
    {
      kind: 'zone' as const,
      inject: (options: ZoneComponentOptions<C>) => ({ point, payload: options }),
    },
  );
  return point;
};

const texts = <M extends Messages>(messages: M): TextsPoint<M> => {
  const point: TextsPoint<M> = {
    kind: 'texts',
    override: overrides => {
      const payload: Record<string, TextOverrides[string]> = {};
      for (const [key, override] of Object.entries(overrides as Messages)) {
        payload[key] = { original: messages[key], override };
      }
      return { point, payload: payload satisfies TextOverrides };
    },
  };
  return point;
};

const value = <T>(): ValuePoint<T> => {
  const point: ValuePoint<T> = {
    kind: 'value',
    patch: (patch: (value: T) => T) => ({ point, payload: patch }),
    resolve: initial => {
      let result = initial;
      for (const registered of patchesOf(point)) {
        try {
          result = (registered.patch as (value: T) => T)(result);
        } catch (error) {
          reportWidgetInjectionError(registered.key, error);
        }
      }
      return result;
    },
  };
  return point;
};

/**
 * The three kinds of points. A feature groups its points in `<feature>.points.ts`, exports them
 * from its barrel, and lists them in its module's `points` — that is what names them and finds
 * their owner.
 */
export const point = {
  /** `point.zone<MyZoneContext>()` — a place that receives components. */
  zone,
  /**
   * `point.texts(myMessages)` — the messages a contributor can override. Only `msg` descriptors:
   * a message with a placeholder is a function, and stays closed.
   */
  texts,
  /** `point.value<MyValue>()` — a value a contributor can patch. */
  value,
};
