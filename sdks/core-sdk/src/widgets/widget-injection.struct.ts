import type { WidgetChange } from './widget-points.struct.ts';

/** Declared in `<intention>.widget-injection.ts`, listed in `@Extension({ widgetInjections })`. */
export interface WidgetInjection {
  /** Unique across all extensions. It names the injection in the errors. */
  readonly id: string;
  readonly changes: readonly WidgetChange[];
}
