/** A cron expression of a trigger: the server accepts 5 fields, minute hour day month weekday. */
export const cronFieldCount = (expression: string): number => {
  const trimmed = expression.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
};

export const isCronExpressionValid = (expression: string): boolean =>
  cronFieldCount(expression) === 5;
