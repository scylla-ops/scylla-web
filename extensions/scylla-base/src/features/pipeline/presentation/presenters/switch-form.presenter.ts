import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import {
  NUMBER_TESTS,
  TEXT_TESTS,
  type Operand,
  type SwitchTest,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { nodeMessages } from '../messages/node.messages.ts';

const TEST_LABELS: Record<SwitchTest, MessageDescriptor> = {
  equals: nodeMessages.testEquals,
  not_equals: nodeMessages.testNotEquals,
  contains: nodeMessages.testContains,
  not_contains: nodeMessages.testNotContains,
  starts_with: nodeMessages.testStartsWith,
  ends_with: nodeMessages.testEndsWith,
  empty: nodeMessages.testEmpty,
  not_empty: nodeMessages.testNotEmpty,
  number_eq: nodeMessages.testEquals,
  number_ne: nodeMessages.testNotEquals,
  number_gt: nodeMessages.testGreater,
  number_ge: nodeMessages.testGreaterOrEqual,
  number_lt: nodeMessages.testLess,
  number_le: nodeMessages.testLessOrEqual,
};

export interface Choice<T extends string> {
  value: T;
  label: string;
}

/** The tests in two groups, Text and Number: `is equal to` is in both. Reads `t()`. */
export const testGroups = (): { label: string; tests: Choice<SwitchTest>[] }[] =>
  [
    { label: nodeMessages.operandText, tests: TEXT_TESTS },
    { label: nodeMessages.testsNumber, tests: NUMBER_TESTS },
  ].map(({ label, tests }) => ({
    label: t(label),
    tests: tests.map(test => ({ value: test, label: t(TEST_LABELS[test]) })),
  }));

/** Each test once, with its group in its label: what the closed select shows. */
export const testChoices = (): Choice<SwitchTest>[] =>
  testGroups().flatMap(({ label, tests }) =>
    tests.map(test => ({ ...test, label: `${test.label} (${label.toLowerCase()})` })),
  );

/** Reads `t()`. */
export const operandKinds = (): Choice<Operand['kind']>[] => [
  { value: 'var', label: t(nodeMessages.operandVariable) },
  { value: 'output', label: t(nodeMessages.operandOutput) },
  { value: 'literal', label: t(nodeMessages.operandText) },
];
