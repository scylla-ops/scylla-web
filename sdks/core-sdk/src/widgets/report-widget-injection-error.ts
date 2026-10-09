/**
 * Logs a failure of one injected component, one `when`, or one patch, naming the injection at
 * fault (`part.key` is `<injectionId>#<index>`). Never throws: one injection must not break the
 * widget it changes.
 */
export const reportWidgetInjectionError = (key: string, error: unknown): void => {
  console.error(`[widget-injections] ${key} failed:`, error);
};
