// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { StepDefinition } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import { envCounts, stepPreview } from '../step-summary.ts';

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
