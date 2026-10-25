import { describe, it, expect } from 'vitest';
import type { PipelineStepEntity, StepDefinition } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import { stepIcon } from '../step-kind.presenter.ts';
import { envCounts, stepPreview, summarize } from '../step-summary.presenter.ts';

const script = (body: string): StepDefinition => ({
  kind: 'script',
  shell: 'bash',
  script: body,
  env: [],
});
const exec = (command: string, args: string[] = []): StepDefinition => ({
  kind: 'exec',
  command,
  args,
  env: [],
});
const step = (id: string, script: string): PipelineStepEntity => ({
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
      detail: 'The step ID cannot contain "B". Use only lowercase letters (a-z), digits, - and _.',
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
    expect(summarize(step('checkout', 'git clone x .'), 'git').icon).toBe(
      stepIcon('script', 'git'),
    );
    expect(summarize(step('checkout', 'git clone x .')).icon).toBe(stepIcon('script'));
  });
});

describe('stepPreview', () => {
  it('shows a command with its arguments', () => {
    expect(stepPreview(exec('docker', ['build', '.']))).toBe('docker build .');
  });

  it('skips the shebang, the comments and the set line of a script', () => {
    expect(
      stepPreview(script('#!/usr/bin/env bash\nset -euo pipefail\n\n# tests\n  npm test\n')),
    ).toBe('npm test');
  });

  it('is empty for a script with nothing to run', () => {
    expect(stepPreview(script('#!/bin/sh\n'))).toBe('');
  });
});

describe('envCounts', () => {
  it('counts the secrets apart from the plain variables', () => {
    expect(
      envCounts({
        ...exec('make'),
        env: [
          { key: 'A', kind: 'literal', value: '1' },
          { key: 'B', kind: 'secret', secretRef: 'token' },
          { key: 'C', kind: 'literal', value: '3' },
        ],
      }),
    ).toEqual({ variables: 2, secrets: 1 });
  });
});
