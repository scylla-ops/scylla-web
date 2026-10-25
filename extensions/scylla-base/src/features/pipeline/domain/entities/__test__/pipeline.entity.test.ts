// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { pipelineIssue, pipelineNameIssue } from '../pipeline.entity.ts';
import type { PipelineStepEntity } from '../pipeline-step.entity.ts';

const step = (id: string): PipelineStepEntity => ({
  id,
  deps: [],
  env: [],
  kind: 'exec',
  command: 'make',
  args: [],
});

describe('pipelineNameIssue', () => {
  it('accepts one word, around which spaces are trimmed', () => {
    expect(pipelineNameIssue('  deploy-api ')).toBeNull();
  });

  it('refuses an empty name and a name with spaces inside', () => {
    expect(pipelineNameIssue('   ')).toBe('empty');
    expect(pipelineNameIssue('deploy api')).toBe('spaces');
  });
});

describe('pipelineIssue', () => {
  it('accepts a name of one word and step ids the server accepts', () => {
    expect(pipelineIssue({ name: 'nightly', nodes: [step('build'), step('test-2')] })).toBeNull();
  });

  it('says the name first, as it is the first field of the form', () => {
    expect(pipelineIssue({ name: 'my pipeline', nodes: [step('Build')] })).toEqual({
      kind: 'name',
      issue: 'spaces',
    });
  });

  it('names every step id the server refuses', () => {
    expect(
      pipelineIssue({ name: 'nightly', nodes: [step('Build'), step('ok'), step('a b')] }),
    ).toEqual({
      kind: 'step-ids',
      ids: ['Build', 'a b'],
    });
  });
});
