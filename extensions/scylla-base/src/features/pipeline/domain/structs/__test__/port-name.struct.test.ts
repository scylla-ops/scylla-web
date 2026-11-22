// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { portNameIssue } from '../port-name.struct.ts';

describe('portNameIssue', () => {
  it('accepts the form of a node id', () => {
    expect(portNameIssue('is-main_2')).toBeNull();
  });

  it('refuses a space around the name: the server does not trim a port', () => {
    expect(portNameIssue(' true')).toEqual({ kind: 'invalid-characters', characters: [' '] });
  });

  it('refuses an empty name, a refused character and more than 128 characters', () => {
    expect(portNameIssue('')).toEqual({ kind: 'empty' });
    expect(portNameIssue('True')).toEqual({ kind: 'invalid-characters', characters: ['T'] });
    expect(portNameIssue('a'.repeat(129))).toEqual({ kind: 'too-long', length: 129 });
  });
});
