// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { StepDefinition } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import {
  envCounts,
  nodeIdIssue,
  stepIssue,
  stepPreview,
  toNodeId,
} from '../step-summary.ts';

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

describe('stepIssue', () => {
  it('flags a command step without a command', () => {
    expect(stepIssue(exec('  '))).toBe('missing-command');
  });

  it('flags a blank script', () => {
    expect(stepIssue(script('\n  \n'))).toBe('empty-script');
  });

  it('finds nothing wrong with a runnable step', () => {
    expect(stepIssue(exec('make'))).toBeNull();
    expect(stepIssue(script('make'))).toBeNull();
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

describe('nodeIdIssue', () => {
  it('accepts lowercase letters, digits, - and _, around spaces the server trims', () => {
    expect(nodeIdIssue('build_image-2')).toBeNull();
    expect(nodeIdIssue('  build ')).toBeNull();
  });

  it('refuses an empty id', () => {
    expect(nodeIdIssue('   ')).toEqual({ kind: 'empty' });
  });

  it('names each refused character once, in the order it appears', () => {
    expect(nodeIdIssue('Build image.Image')).toEqual({
      kind: 'invalid-characters',
      characters: ['B', ' ', '.', 'I'],
    });
    expect(nodeIdIssue('déploiement')).toEqual({ kind: 'invalid-characters', characters: ['é'] });
  });

  it('refuses more than 128 characters', () => {
    expect(nodeIdIssue('a'.repeat(128))).toBeNull();
    expect(nodeIdIssue('a'.repeat(129))).toEqual({ kind: 'too-long', length: 129 });
  });
});

describe('toNodeId', () => {
  it('gives the nearest valid id', () => {
    expect(toNodeId('  Build Docker image! ')).toBe('build-docker-image');
    expect(toNodeId('Déploiement prod')).toBe('deploiement-prod');
    expect(toNodeId('a'.repeat(200))).toHaveLength(128);
  });

  it('falls back to "step" when nothing is left', () => {
    expect(toNodeId('***')).toBe('step');
  });

  it('gives an id that has no issue', () => {
    for (const raw of ['Ça va', '__x__', 'A/B\\C', '  ']) expect(nodeIdIssue(toNodeId(raw))).toBeNull();
  });
});
