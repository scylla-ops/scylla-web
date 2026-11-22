import { t } from '@scylla/ui/i18n';
import type {
  ConditionFieldIssue,
  ConditionValueIssue,
  WebhookCondition,
  WebhookConditionOperator,
  WebhookConditionSource,
} from '@base/features/triggers/domain/structs/webhook-condition.struct.ts';
import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

/** An entry of a menu of the condition editor. */
export interface ConditionOption<T extends string> {
  value: T;
  label: string;
}

export const conditionSourceOptions = (): ConditionOption<WebhookConditionSource>[] => [
  { value: 'header', label: t(triggersMessages.conditionHeader) },
  { value: 'jsonPointer', label: t(triggersMessages.conditionBodyField) },
];

/** The comparison of a condition, as its menu shows it. */
export const conditionOperatorLabel = (operator: WebhookConditionOperator): string => {
  switch (operator) {
    case 'is':
      return t(triggersMessages.operatorIs);
    case 'matches':
      return t(triggersMessages.operatorMatches);
    case 'oneOf':
      return t(triggersMessages.operatorOneOf);
  }
};

export const conditionOperatorOptions = (): ConditionOption<WebhookConditionOperator>[] =>
  (['is', 'matches', 'oneOf'] as const).map(value => ({
    value,
    label: conditionOperatorLabel(value),
  }));

/** Examples of the GitHub push event: they are code, not text, so they are not translated. */
export const conditionFieldPlaceholder = (source: WebhookConditionSource): string =>
  source === 'header' ? 'X-GitHub-Event' : '/ref';

export const conditionValuePlaceholder = (condition: WebhookCondition): string => {
  if (condition.operator === 'matches') return 'refs/heads/*';
  return condition.source === 'header' ? 'push' : 'refs/heads/main';
};

export const conditionFieldIssueText = (issue: ConditionFieldIssue): string => {
  switch (issue) {
    case 'blankHeader':
      return t(triggersMessages.giveAHeaderName);
    case 'notAHeader':
      return t(triggersMessages.notAHeaderName);
    case 'notAPointer':
      return t(triggersMessages.notAPointer);
  }
};

export const conditionValueIssueText = (issue: ConditionValueIssue): string => {
  switch (issue) {
    case 'blank':
      return t(triggersMessages.giveAValue);
    case 'tooLong':
      return t(triggersMessages.valueTooLong);
    case 'duplicate':
      return t(triggersMessages.valueDuplicate);
    case 'tooMany':
      return t(triggersMessages.valueTooMany);
  }
};

/** One condition in a line: "/ref is refs/heads/main". */
export const conditionSummary = (condition: WebhookCondition): string => {
  const [first = ''] = condition.values;
  switch (condition.operator) {
    case 'is':
      return t(triggersMessages.conditionIs(condition.field, first));
    case 'matches':
      return t(triggersMessages.conditionMatches(condition.field, first));
    case 'oneOf':
      return t(triggersMessages.conditionOneOf(condition.field, condition.values.join(', ')));
  }
};
