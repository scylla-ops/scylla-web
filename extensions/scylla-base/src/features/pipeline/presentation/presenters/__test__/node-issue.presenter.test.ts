import { describe, it, expect } from 'vitest';
import { NODE_ISSUE_MESSAGES, nodeIdIssueText } from '../node-issue.presenter.ts';

describe('nodeIdIssueText', () => {
  it('says an empty id is refused', () => {
    expect(nodeIdIssueText({ kind: 'empty' })).toBe('The node ID cannot be empty.');
  });

  it('quotes each refused character, and shows a space as ␣', () => {
    expect(nodeIdIssueText({ kind: 'invalid-characters', characters: ['B', ' '] })).toBe(
      'The node ID cannot contain "B", "␣". Use only lowercase letters (a-z), digits, - and _.',
    );
  });

  it('gives the length of an id that is too long', () => {
    expect(nodeIdIssueText({ kind: 'too-long', length: 130 })).toBe(
      'The node ID has 130 characters. The maximum is 128.',
    );
  });
});

describe('NODE_ISSUE_MESSAGES', () => {
  it('has a text for each thing that stops a node from running', () => {
    expect(NODE_ISSUE_MESSAGES['missing-command'].message).toBe('A command is required.');
    expect(NODE_ISSUE_MESSAGES['empty-script'].message).toBe('The script is empty.');
  });
});
