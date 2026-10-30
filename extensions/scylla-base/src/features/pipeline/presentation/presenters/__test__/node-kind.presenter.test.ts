// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { KIND_TONES, nodeIcon } from '../node-kind.presenter.ts';

describe('nodeIcon', () => {
  it('gives each kind its own icon', () => {
    expect(nodeIcon('script')).not.toBe(nodeIcon('exec'));
  });

  it('takes the icon of a known template hint', () => {
    expect(nodeIcon('script', 'git')).not.toBe(nodeIcon('script'));
  });

  it('falls back to the icon of the kind for an unknown hint', () => {
    expect(nodeIcon('exec', 'unknown')).toBe(nodeIcon('exec'));
  });
});

describe('KIND_TONES', () => {
  it('gives each kind its own colour', () => {
    expect(KIND_TONES.script.text).not.toBe(KIND_TONES.exec.text);
  });
});
