// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PIPELINE_NAME_MAX_LENGTH, pipelineNameIssue } from '../pipeline-name.struct.ts';

describe('pipelineNameIssue', () => {
  it('accepts a name with spaces, around which spaces are trimmed', () => {
    expect(pipelineNameIssue('  Branch Policy ')).toBeNull();
    expect(pipelineNameIssue('Build: and deploy')).toBeNull();
  });

  it('refuses an empty name', () => {
    expect(pipelineNameIssue('   ')).toBe('empty');
  });

  it('refuses a name longer than the server accepts, counted in characters after trim', () => {
    expect(pipelineNameIssue(` ${'a'.repeat(PIPELINE_NAME_MAX_LENGTH)} `)).toBeNull();
    expect(pipelineNameIssue('a'.repeat(PIPELINE_NAME_MAX_LENGTH + 1))).toBe('too-long');
    expect(pipelineNameIssue('é'.repeat(PIPELINE_NAME_MAX_LENGTH))).toBeNull();
  });

  it('refuses a line break or another control character', () => {
    expect(pipelineNameIssue('deploy\napi')).toBe('not-one-line');
    expect(pipelineNameIssue('deploy\tapi')).toBe('not-one-line');
  });
});
