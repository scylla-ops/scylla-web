// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { stepIdIssue, toStepId } from '../step-id.struct.ts';

describe('stepIdIssue', () => {
  it('accepts lowercase letters, digits, - and _, around spaces the server trims', () => {
    expect(stepIdIssue('build_image-2')).toBeNull();
    expect(stepIdIssue('  build ')).toBeNull();
  });

  it('refuses an empty id', () => {
    expect(stepIdIssue('   ')).toEqual({ kind: 'empty' });
  });

  it('names each refused character once, in the order it appears', () => {
    expect(stepIdIssue('Build image.Image')).toEqual({
      kind: 'invalid-characters',
      characters: ['B', ' ', '.', 'I'],
    });
    expect(stepIdIssue('déploiement')).toEqual({ kind: 'invalid-characters', characters: ['é'] });
  });

  it('refuses more than 128 characters', () => {
    expect(stepIdIssue('a'.repeat(128))).toBeNull();
    expect(stepIdIssue('a'.repeat(129))).toEqual({ kind: 'too-long', length: 129 });
  });
});

describe('toStepId', () => {
  it('gives the nearest valid id', () => {
    expect(toStepId('  Build Docker image! ')).toBe('build-docker-image');
    expect(toStepId('Déploiement prod')).toBe('deploiement-prod');
    expect(toStepId('a'.repeat(200))).toHaveLength(128);
  });

  it('falls back to "step" when nothing is left', () => {
    expect(toStepId('***')).toBe('step');
  });

  it('gives an id that has no issue', () => {
    for (const raw of ['Ça va', '__x__', 'A/B\\C', '  '])
      expect(stepIdIssue(toStepId(raw))).toBeNull();
  });
});
