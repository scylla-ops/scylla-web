import type {
  PullRequestSource,
  PushSource,
  TagSource,
  TriggerDraft,
  TriggerEntity,
  TriggerDraftKind,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';
import {
  conditionFieldIssue,
  conditionValuesIssue,
  type WebhookCondition,
} from '@base/features/triggers/domain/structs/webhook-condition.struct.ts';

import { convertCronToUTC } from './cron-timezone.mapper.ts';

export interface DraftInput {
  key: string;
  valueKind: 'literal' | 'jsonPointer';
  value: string;
}

export const triggerToDraftInputs = (trigger?: TriggerEntity): DraftInput[] =>
  (trigger?.inputs ?? []).map(input => ({
    key: input.key,
    valueKind: input.value.kind,
    value: input.value.value,
  }));

/** The rules of each Git kind, apart: a change of the kind keeps what was typed for another. */
export interface GitRulesDraft {
  push: PushSource;
  pullRequest: PullRequestSource;
  tag: TagSource;
}

/** The rules of the trigger for its own kind, and the defaults for the other kinds. */
export const triggerToGitRules = (trigger?: TriggerEntity): GitRulesDraft => {
  const source = trigger?.source;
  return {
    push:
      source?.kind === 'push'
        ? source
        : { kind: 'push', branches: [], excludeBranches: [], skipCi: true },
    pullRequest:
      source?.kind === 'pullRequest'
        ? source
        : {
            kind: 'pullRequest',
            branches: [],
            events: ['opened', 'newCommits', 'reopened', 'readyForReview'],
            drafts: false,
          },
    tag: source?.kind === 'tag' ? source : { kind: 'tag', patterns: [] },
  };
};

/** The conditions of a webhook trigger, as copies the form can change. */
export const triggerToConditions = (trigger?: TriggerEntity): WebhookCondition[] =>
  trigger?.source.kind === 'webhook'
    ? trigger.source.conditions.map(condition => ({ ...condition, values: [...condition.values] }))
    : [];

/** `true` when the server can take each condition: the form keeps Save off until then. */
export const conditionsAreValid = (conditions: readonly WebhookCondition[]): boolean =>
  conditions.every(
    condition => !conditionFieldIssue(condition) && !conditionValuesIssue(condition),
  );

/** Trimmed copies. `is` and `matches` keep their first value only. */
const conditionsOf = (conditions: readonly WebhookCondition[]): WebhookCondition[] =>
  conditions.map(condition => {
    const values = condition.values.map(value => value.trim());
    return {
      source: condition.source,
      field: condition.field.trim(),
      operator: condition.operator,
      values: condition.operator === 'oneOf' ? values : values.slice(0, 1),
    };
  });

/** Plain copies: the form holds its rules in `$state` proxies. */
const sourceOf = (
  kind: TriggerDraftKind,
  cronExpression: string,
  rules: GitRulesDraft,
  conditions: readonly WebhookCondition[],
): TriggerDraft['source'] => {
  switch (kind) {
    case 'cron':
      return { kind: 'cron', expression: convertCronToUTC(cronExpression.trim()) };
    case 'webhook':
      return { kind: 'webhook', conditions: conditionsOf(conditions) };
    case 'push':
      return {
        kind: 'push',
        branches: [...rules.push.branches],
        excludeBranches: [...rules.push.excludeBranches],
        skipCi: rules.push.skipCi,
      };
    case 'pullRequest':
      return {
        kind: 'pullRequest',
        branches: [...rules.pullRequest.branches],
        events: [...rules.pullRequest.events],
        drafts: rules.pullRequest.drafts,
      };
    case 'tag':
      return { kind: 'tag', patterns: [...rules.tag.patterns] };
  }
};

export const buildTriggerDraft = (params: {
  name: string;
  kind: TriggerDraftKind;
  cronExpression: string;
  inputs: DraftInput[];
  rules?: GitRulesDraft;
  conditions?: WebhookCondition[];
}): TriggerDraft => {
  const allowPointer = params.kind === 'webhook';

  const inputs = params.inputs
    .filter(input => input.key.trim().length > 0)
    .map(input =>
      allowPointer && input.valueKind === 'jsonPointer'
        ? { key: input.key.trim(), value: { kind: 'jsonPointer', value: input.value } as const }
        : { key: input.key.trim(), value: { kind: 'literal', value: input.value } as const },
    );

  return {
    name: params.name.trim(),
    source: sourceOf(
      params.kind,
      params.cronExpression,
      params.rules ?? triggerToGitRules(),
      params.conditions ?? [],
    ),
    inputs,
  };
};
