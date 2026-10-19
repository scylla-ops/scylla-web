import { describe, it, expect } from 'vitest';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { stepIcon } from '@base/features/pipeline/presentation/ui/editor/step/step-kinds.ts';
import { summarize } from '../node-view.ts';

const step = (id: string, script: string): PipelineStep => ({
  id,
  deps: [],
  kind: 'script',
  shell: 'bash',
  script,
  env: [],
});

describe('summarize', () => {
  it('shows a refused id before an empty script: the server rejects the whole pipeline for it', () => {
    expect(summarize(step('Build', '')).problem).toEqual({
      label: 'Invalid step ID',
      detail:
        'The step ID cannot contain "B". Use only lowercase letters (a-z), digits, - and _.',
    });
  });

  it('shows what stops a valid step from running', () => {
    expect(summarize(step('build', '')).problem).toEqual({
      label: 'The script is empty.',
      detail: 'The script is empty.',
    });
  });

  it('shows no problem for a step that can be saved and run', () => {
    expect(summarize(step('build', 'make')).problem).toBeNull();
  });

  it('shows the icon of the template whose code the step runs', () => {
    expect(summarize(step('checkout', 'git clone x .'), 'git').icon).toBe(stepIcon('script', 'git'));
    expect(summarize(step('checkout', 'git clone x .')).icon).toBe(stepIcon('script'));
  });
});
