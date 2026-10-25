import { describe, it, expect } from 'vitest';
import { STEP_ISSUE_MESSAGES, stepIdIssueText } from '../step-issue.presenter.ts';

describe('stepIdIssueText', () => {
  it('says an empty id is refused', () => {
    expect(stepIdIssueText({ kind: 'empty' })).toBe('The step ID cannot be empty.');
  });

  it('quotes each refused character, and shows a space as ␣', () => {
    expect(stepIdIssueText({ kind: 'invalid-characters', characters: ['B', ' '] })).toBe(
      'The step ID cannot contain "B", "␣". Use only lowercase letters (a-z), digits, - and _.',
    );
  });

  it('gives the length of an id that is too long', () => {
    expect(stepIdIssueText({ kind: 'too-long', length: 130 })).toBe(
      'The step ID has 130 characters. The maximum is 128.',
    );
  });
});

describe('STEP_ISSUE_MESSAGES', () => {
  it('has a text for each thing that stops a step from running', () => {
    expect(STEP_ISSUE_MESSAGES['missing-command'].message).toBe('A command is required.');
    expect(STEP_ISSUE_MESSAGES['empty-script'].message).toBe('The script is empty.');
  });
});
