import type { Component } from 'svelte';
import type { RegisteredComponent } from './widget-injection-registry.ts';
import { reportWidgetInjectionError } from './report-widget-injection-error.ts';

/**
 * One promise per component, keyed by the registered object itself: a new registry (a new test,
 * a fresh app start) gives new `RegisteredComponent` objects, so the cache invalidates itself —
 * nothing to clear by hand.
 */
const cache = new WeakMap<RegisteredComponent<never>, Promise<Component<{ context: never }> | null>>();

/**
 * Never rejects: a failed import is logged and resolves to `null`, so the caller renders
 * nothing for it with a plain `{#if}` — no `{:catch}` block, no error to re-throw.
 */
export const loadInjectedComponent = <C>(
  part: RegisteredComponent<C>,
): Promise<Component<{ context: C }> | null> => {
  const key = part as RegisteredComponent<never>;
  let promise = cache.get(key);
  if (!promise) {
    promise = part
      .component()
      .then(module => module.default)
      .catch((error: unknown) => {
        reportWidgetInjectionError(part.key, error);
        return null;
      });
    cache.set(key, promise);
  }
  return promise as Promise<Component<{ context: C }> | null>;
};
