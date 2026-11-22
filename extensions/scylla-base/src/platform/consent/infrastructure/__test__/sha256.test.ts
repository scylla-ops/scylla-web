// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { sha256 } from '../sha256.ts';

const reference = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

describe('sha256', () => {
  it('gives the digests of the standard', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it.each([
    'Votre choix sur les cookies',
    'a'.repeat(55),
    'a'.repeat(56),
    'a'.repeat(64),
    'é'.repeat(300),
  ])('gives the digest of Node for %#', text => {
    expect(sha256(text)).toBe(reference(text));
  });
});
