/** A cron expression of a trigger: minute hour day month weekday, evaluated in UTC. */
export type CronExpression = string;

export const cronFieldCount = (expression: string): number => {
  const trimmed = expression.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
};

/** The server accepts 5 fields. */
export const isCronExpressionValid = (expression: string): boolean =>
  cronFieldCount(expression) === 5;
