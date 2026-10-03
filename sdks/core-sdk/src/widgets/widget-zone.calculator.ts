import { canForWidgets, type RegisteredComponent } from './widget-injection-registry.ts';
import { reportWidgetInjectionError } from './report-widget-injection-error.ts';

export interface ResolvedZone<C> {
  readonly before: readonly RegisteredComponent<C>[];
  /** At most one: the loader rejects a second `replace` on the same zone. */
  readonly replace?: RegisteredComponent<C>;
  readonly after: readonly RegisteredComponent<C>[];
}

/**
 * Pure: which of `components` are active for `context` (their `when` and `permission` pass),
 * split by position. `components` is in load order — the split below keeps that order within
 * each group.
 */
export const resolveZone = <C>(
  components: readonly RegisteredComponent<C>[],
  context: C,
): ResolvedZone<C> => {
  const can = canForWidgets();

  const active = components.filter(component => {
    if (component.permission && !(can?.(component.permission) ?? false)) return false;
    if (!component.when) return true;
    try {
      return component.when(context);
    } catch (error) {
      reportWidgetInjectionError(component.key, error);
      return false;
    }
  });

  return {
    before: active.filter(component => (component.position ?? 'after') === 'before'),
    replace: active.find(component => component.position === 'replace'),
    after: active.filter(component => (component.position ?? 'after') === 'after'),
  };
};
