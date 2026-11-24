/** Where a condition reads the value of a delivery: a header, or a field of the JSON body. */
export type WebhookConditionSource = 'header' | 'jsonPointer';

/** `is`: equal. `matches`: a glob, as the globs of the branches. `oneOf`: equal to one value. */
export type WebhookConditionOperator = 'is' | 'matches' | 'oneOf';

/** A delivery of a webhook starts a run only when each condition of its trigger matches. */
export interface WebhookCondition {
  source: WebhookConditionSource;
  /** The header name (upper and lower case are the same), or a JSON pointer such as `/ref`. */
  field: string;
  operator: WebhookConditionOperator;
  /** One value for `is` and `matches`, one or more for `oneOf`. */
  values: string[];
}

/** The server accepts at most 32 conditions on one webhook. */
export const MAX_CONDITIONS = 32;

/** The server accepts at most 32 values in one condition. */
export const MAX_CONDITION_VALUES = 32;

/** The longest value that the server accepts, in characters. */
export const MAX_CONDITION_VALUE_LENGTH = 1024;

/** The longest header name or JSON pointer that the server accepts, in characters. */
export const MAX_CONDITION_FIELD_LENGTH = 256;

export type ConditionFieldIssue = 'blankHeader' | 'notAHeader' | 'notAPointer';

export type ConditionValueIssue = 'blank' | 'tooLong' | 'duplicate' | 'tooMany';

/** The characters of an HTTP header name. */
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;

/** Why the header name or the JSON pointer of a condition is refused, or `null`. */
export const conditionFieldIssue = (condition: WebhookCondition): ConditionFieldIssue | null => {
  const field = condition.field.trim();
  if (condition.source === 'jsonPointer') {
    return field.startsWith('/') && [...field].length <= MAX_CONDITION_FIELD_LENGTH
      ? null
      : 'notAPointer';
  }
  if (field.length === 0) return 'blankHeader';
  return HEADER_NAME.test(field) && field.length <= MAX_CONDITION_FIELD_LENGTH
    ? null
    : 'notAHeader';
};

/** Why the values of a condition are refused, or `null`: a condition needs a value. */
export const conditionValuesIssue = (condition: WebhookCondition): 'blank' | null =>
  condition.values.length === 0 || condition.values.some(value => value.trim().length === 0)
    ? 'blank'
    : null;

/** Why a value cannot join the values of an `oneOf` condition, or `null`. */
export const conditionValueIssue = (
  value: string,
  list: readonly string[],
): ConditionValueIssue | null => {
  const text = value.trim();
  if (text.length === 0) return 'blank';
  if ([...text].length > MAX_CONDITION_VALUE_LENGTH) return 'tooLong';
  if (list.includes(text)) return 'duplicate';
  if (list.length >= MAX_CONDITION_VALUES) return 'tooMany';
  return null;
};

/** `is one of` keeps each value that is not blank; `is` and `matches` keep the first one. */
export const withOperator = (
  condition: WebhookCondition,
  operator: WebhookConditionOperator,
): WebhookCondition => {
  const values = condition.values.filter(value => value.trim().length > 0);
  return { ...condition, operator, values: operator === 'oneOf' ? values : values.slice(0, 1) };
};
