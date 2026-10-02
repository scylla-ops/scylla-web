import type { WidgetInjectionItem } from './widget-points.struct.ts';

/**
 * The items of one intention, in `<intention>.widget-injection.ts`. Listed with the shorthand
 * property — `@Extension({ widgetInjections: { EmailLoginWidgetInjection } })` — so the key is
 * the constant's name: the loader names it `<extension id>/<key>` in the errors.
 */
export type WidgetInjection = readonly WidgetInjectionItem[];
