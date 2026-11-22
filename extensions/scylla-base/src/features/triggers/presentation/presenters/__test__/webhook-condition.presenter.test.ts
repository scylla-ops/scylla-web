import { describe, it, expect } from 'vitest';
import {
  conditionOperatorOptions,
  conditionSummary,
  conditionValueIssueText,
} from '../webhook-condition.presenter.ts';

describe('webhook condition presenter', () => {
  it('sums up a condition of a webhook in one line', () => {
    expect(
      conditionSummary({
        source: 'header',
        field: 'X-GitHub-Event',
        operator: 'is',
        values: ['push'],
      }),
    ).toBe('X-GitHub-Event is push');
    expect(
      conditionSummary({
        source: 'jsonPointer',
        field: '/ref',
        operator: 'matches',
        values: ['refs/heads/release/*'],
      }),
    ).toBe('/ref matches refs/heads/release/*');
    expect(
      conditionSummary({
        source: 'jsonPointer',
        field: '/repository/full_name',
        operator: 'oneOf',
        values: ['acme/api', 'acme/web'],
      }),
    ).toBe('/repository/full_name is one of acme/api, acme/web');
  });

  it('offers the three comparisons in the order of the menu', () => {
    expect(conditionOperatorOptions().map(option => option.label)).toEqual([
      'is',
      'matches',
      'is one of',
    ]);
  });

  it('tells why a value is refused', () => {
    expect(conditionValueIssueText('blank')).toBe('Give a value.');
    expect(conditionValueIssueText('duplicate')).toBe('This value is already in the list.');
  });
});
