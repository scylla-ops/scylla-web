// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { KIND_TONES, stepIcon } from '../step-kind.presenter.ts';

describe('stepIcon', () => {
  it('gives each kind its own icon', () => {
    expect(stepIcon('script')).not.toBe(stepIcon('exec'));
  });

  it('takes the icon of a known template hint', () => {
    expect(stepIcon('script', 'git')).not.toBe(stepIcon('script'));
  });

  it('falls back to the icon of the kind for an unknown hint', () => {
    expect(stepIcon('exec', 'unknown')).toBe(stepIcon('exec'));
  });
});

describe('KIND_TONES', () => {
  it('gives each kind its own colour', () => {
    expect(KIND_TONES.script.text).not.toBe(KIND_TONES.exec.text);
  });
});
