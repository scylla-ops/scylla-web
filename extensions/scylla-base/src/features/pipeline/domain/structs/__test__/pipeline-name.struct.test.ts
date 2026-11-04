// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { pipelineNameIssue } from '../pipeline-name.struct.ts';

describe('pipelineNameIssue', () => {
  it('accepts one word, around which spaces are trimmed', () => {
    expect(pipelineNameIssue('  deploy-api ')).toBeNull();
  });

  it('refuses an empty name and a name with spaces inside', () => {
    expect(pipelineNameIssue('   ')).toBe('empty');
    expect(pipelineNameIssue('deploy api')).toBe('spaces');
  });
});
