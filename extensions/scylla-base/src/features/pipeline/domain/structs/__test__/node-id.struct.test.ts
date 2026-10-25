// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { nodeIdIssue, toNodeId } from '../node-id.struct.ts';

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

  it('falls back to "node" when nothing is left', () => {
    expect(toNodeId('***')).toBe('node');
  });

  it('gives an id that has no issue', () => {
    for (const raw of ['Ça va', '__x__', 'A/B\\C', '  '])
      expect(nodeIdIssue(toNodeId(raw))).toBeNull();
  });
});
