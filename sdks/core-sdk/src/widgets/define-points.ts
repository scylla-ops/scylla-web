import { componentsOf, patchesOf, textOverridesOf } from './widget-injection-registry.ts';
import { reportWidgetInjectionError } from './report-widget-injection-error.ts';
import { resolveZone } from './widget-zone.calculator.ts';
import type {
  TextsPoint,
  ValuePoint,
  WidgetChange,
  ZoneComponentOptions,
  ZonePoint,
} from './widget-points.struct.ts';

interface ZoneSpec<C> {
  readonly kind: 'zone';
  /** Phantom: carries `C` for `PointOf` to read back. Never set at runtime. */
  readonly __context?: C;
}

interface TextsSpec<M> {
  readonly kind: 'texts';
  readonly messages: M;
}

interface ValueSpec<T> {
  readonly kind: 'value';
  /** Phantom: carries `T` for `PointOf` to read back. Never set at runtime. */
  readonly __value?: T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a spec's own generic varies per key; `definePoints` re-derives each one through `PointOf`.
type AnySpec = ZoneSpec<any> | TextsSpec<any> | ValueSpec<any>;

/** Builders for the three kinds of points. Give each one its own generic when you call it. */
export const point = {
  /** `point.zone<MyZoneContext>()` — a place that receives components. */
  zone: <C>(): ZoneSpec<C> => ({ kind: 'zone' }),
  /** `point.texts(myMessages)` — the messages a contributor can override. */
  texts: <M extends object>(messages: M): TextsSpec<M> => ({ kind: 'texts', messages }),
  /** `point.value<MyValue>()` — a value a contributor can patch. */
  value: <T>(): ValueSpec<T> => ({ kind: 'value' }),
};

export type PointOf<S> =
  S extends ZoneSpec<infer C>
    ? ZonePoint<C>
    : S extends TextsSpec<infer M>
      ? TextsPoint<M>
      : S extends ValueSpec<infer T>
        ? ValuePoint<T>
        : never;

const createZonePoint = <C>(name: string): ZonePoint<C> => ({
  name,
  inject: (options: ZoneComponentOptions<C>): WidgetChange => ({
    point: name,
    kind: 'zone',
    payload: options,
  }),
  with: context => ({ zone: name, context }),
  hasReplacement: context => resolveZone(componentsOf(name), context).replace !== undefined,
});

const createTextsPoint = <M extends object>(name: string, messages: M): TextsPoint<M> => ({
  name,
  override: (overrides: Partial<M>): WidgetChange => ({ point: name, kind: 'texts', payload: overrides }),
  get messages(): M {
    const overrides = textOverridesOf(name);
    return Object.keys(overrides).length === 0 ? messages : { ...messages, ...overrides };
  },
});

const createValuePoint = <T>(name: string): ValuePoint<T> => ({
  name,
  patch: (patch: (value: T) => T): WidgetChange => ({ point: name, kind: 'value', payload: patch }),
  resolve: value => {
    let result = value;
    for (const registered of patchesOf(name)) {
      try {
        result = (registered.patch as (value: T) => T)(result);
      } catch (error) {
        reportWidgetInjectionError(registered.key, error);
      }
    }
    return result;
  },
});

const createPoint = (name: string, spec: AnySpec): unknown => {
  switch (spec.kind) {
    case 'zone':
      return createZonePoint(name);
    case 'texts':
      return createTextsPoint(name, spec.messages as object);
    case 'value':
      return createValuePoint(name);
  }
};

const definedScopes = new Set<string>();

/**
 * The points of one module. `scope` is the module id: each point is named `<scope>.<key>`.
 * Throws when a scope is defined twice — two features sharing one module id is the bug this
 * catches. (This codebase sets up no `import.meta.hot.accept()` anywhere, so Vite's default dev
 * behaviour for a plain `.ts` module with no HMR boundary of its own is a full page reload, not
 * an in-place re-evaluation with stale global state — this check does not need to survive HMR.)
 */
export const definePoints = <S extends Record<string, AnySpec>>(
  scope: string,
  specs: S,
): { readonly [K in keyof S]: PointOf<S[K]> } => {
  if (definedScopes.has(scope)) {
    throw new Error(
      `Two modules define points with the scope "${scope}". A scope is a module id: ` +
        'give each a different one.',
    );
  }
  definedScopes.add(scope);

  const points: Record<string, unknown> = {};
  for (const key of Object.keys(specs)) {
    points[key] = createPoint(`${scope}.${key}`, specs[key]);
  }
  // `createPoint` dispatches on the runtime `kind` of each spec; TypeScript cannot verify that
  // correspondence against the compile-time conditional type `PointOf<S[K]>` by itself — this
  // is the one cast that bridges the two, same as implementing a mapped type ever needs.
  return points as { readonly [K in keyof S]: PointOf<S[K]> };
};
